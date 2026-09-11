import { useState, useCallback, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import SessionScorecard from "@/components/SessionScorecard/index.js";

const DAY_LABELS: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };

const USEFULNESS_SCALE = [
  { value: 1, label: "Not at all", color: "border-red-300 bg-red-50 text-red-700" },
  { value: 2, label: "Slightly", color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: 3, label: "Moderate", color: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  { value: 4, label: "Good", color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: 5, label: "Excellent", color: "border-green-300 bg-green-50 text-green-700" },
];

type SessionRating = { rating: number; usefulness: number; comment: string };
type OverallRating = Record<string, number>;
type OpenResponses = Record<string, string>;
type DayStatus = { day_number: number; submitted: boolean };
type TeamProgress = { team_id: number; team_name: string; team_color: string | null; total_members: number; submitted_count: number };

function CountdownTimer({ deadlineIso }: { deadlineIso: string }) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const deadline = new Date(deadlineIso);
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) { setRemaining("Deadline passed"); setUrgent(true); return; }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${hours}h ${mins}m remaining`);
      setUrgent(hours < 2);
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [deadlineIso]);

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${urgent ? "text-red-500" : "text-muted-foreground"}`}>
      <Icon icon="clock" className="w-3.5 h-3.5" />
      <span>{remaining}</span>
      <span className="text-muted-foreground/50">· Due 9am PT</span>
    </div>
  );
}

function TeamRaceBoard({ teams, dayNumber }: { teams: TeamProgress[]; dayNumber: number }) {
  if (teams.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon icon="trophy" className="w-4 h-4 text-camp-amber" />
        Day {dayNumber} Survey Race
      </h3>
      <div className="flex flex-col gap-2">
        {teams.map((t, i) => {
          const pct = t.total_members > 0 ? Math.round((t.submitted_count / t.total_members) * 100) : 0;
          const isComplete = t.submitted_count === t.total_members;
          return (
            <div key={t.team_id} className="flex items-center gap-3">
              <span className="text-xs font-bold w-5 text-center text-muted-foreground">{i + 1}</span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.team_color ?? "#6b7280" }} />
              <span className="text-sm font-medium flex-1 truncate">{t.team_name}</span>
              <div className="w-24 h-2.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${isComplete ? "bg-camp-green" : "bg-primary/60"}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {t.submitted_count}/{t.total_members}
              </span>
              {isComplete && <Icon icon="check-circle" className="w-4 h-4 text-camp-green" />}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 italic">
        First team with 100% earns +15 pts, 2nd +10, 3rd +5, 4th +3
      </p>
    </Card>
  );
}

export default function SurveyPage() {
  const user = useSuperblocksUser();
  const [selectedDay, setSelectedDay] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ points: number; late: boolean; teamBonus: number } | null>(null);

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

  const { data: surveyData, loading: loadingSurvey, refetch } = useApiData("GetDailySurvey", {
    camper_id: camperId,
    day_number: selectedDay,
  }, { enabled: camperId > 0, refetchInterval: 30000 });

  const numDays = surveyData?.num_days ?? 4;
  const isFinalDay = surveyData?.is_final_day ?? false;
  const alreadySubmitted = surveyData?.already_submitted ?? false;
  const isLocked = surveyData?.locked ?? false;
  const sessions = surveyData?.sessions ?? [];
  const dayStatuses: DayStatus[] = surveyData?.day_statuses ?? [];
  const teamProgress: TeamProgress[] = surveyData?.team_progress ?? [];

  const [sessionRatings, setSessionRatings] = useState<Record<number, SessionRating>>({});
  const [openResponses, setOpenResponses] = useState<OpenResponses>({});
  const [overallRatings, setOverallRatings] = useState<OverallRating>({});
  const [overallOpen, setOverallOpen] = useState<OpenResponses>({});

  const { run: submitSurvey, loading: submitting } = useApi("SubmitDailySurvey");

  const handleDayChange = useCallback((day: number) => {
    setSelectedDay(day);
    setSessionRatings({});
    setOpenResponses({});
    setOverallRatings({});
    setOverallOpen({});
    setSubmitted(false);
    setSubmitResult(null);
  }, []);

  const updateSessionRating = useCallback((sessionId: number, val: SessionRating) => {
    setSessionRatings(prev => ({ ...prev, [sessionId]: val }));
  }, []);

  const allSessionsRated = useMemo(() =>
    sessions.every((s: { id: number }) => {
      const r = sessionRatings[s.id];
      return r && r.rating > 0 && r.usefulness > 0;
    }), [sessions, sessionRatings]);

  const allOverallRated = useMemo(() => {
    if (!isFinalDay) return true;
    return (surveyData?.overall_aspects ?? []).every((a: { key: string }) => overallRatings[a.key] > 0);
  }, [isFinalDay, surveyData, overallRatings]);

  const requiredOpenFilled = useMemo(() => {
    if (!isFinalDay) return true;
    return (surveyData?.overall_open_questions ?? [])
      .filter((q: { required: boolean }) => q.required)
      .every((q: { key: string }) => (overallOpen[q.key] ?? "").trim().length > 0);
  }, [isFinalDay, surveyData, overallOpen]);

  const canSubmit = allSessionsRated && allOverallRated && requiredOpenFilled;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) { toast.error("Please rate all sessions before submitting"); return; }
    try {
      const result = await submitSurvey({
        camper_id: camperId, day_number: selectedDay,
        session_ratings: sessions.map((s: { id: number; title: string; session_type: string }) => ({
          agenda_item_id: s.id, session_title: s.title, session_type: s.session_type,
          rating: sessionRatings[s.id]?.rating ?? 3, usefulness: sessionRatings[s.id]?.usefulness ?? 3,
          comment: sessionRatings[s.id]?.comment ?? null,
        })),
        open_responses: Object.entries(openResponses).map(([key, response]) => ({ key, response })),
        overall_ratings: isFinalDay ? Object.entries(overallRatings).map(([aspect_key, rating]) => ({ aspect_key, rating })) : null,
        overall_open_responses: isFinalDay ? Object.entries(overallOpen).map(([key, response]) => ({ key, response })) : null,
      });
      const r = result as any;
      setSubmitResult({ points: r?.points_awarded ?? 0, late: r?.late ?? false, teamBonus: r?.team_race_bonus ?? 0 });
      setSubmitted(true);
      refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed: " + message);
    }
  }, [canSubmit, camperId, selectedDay, sessions, sessionRatings, openResponses, overallRatings, overallOpen, isFinalDay, submitSurvey, refetch]);

  if (loadingCamper || loadingSurvey) {
    return <div className="max-w-2xl mx-auto p-6 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-32 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon icon="clipboard-list" className="w-6 h-6 text-primary" />
          Daily Reflection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Rate today's sessions — your feedback shapes cAMP 201</p>
        {surveyData?.deadline_iso && <div className="mt-2"><CountdownTimer deadlineIso={surveyData.deadline_iso} /></div>}
      </div>

      {/* Day progress cards */}
      <div className="flex gap-2 mb-6">
        {dayStatuses.map((ds) => {
          const isSelected = ds.day_number === selectedDay;
          const isDone = ds.submitted;
          return (
            <button
              key={ds.day_number}
              onClick={() => handleDayChange(ds.day_number)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                isSelected ? "border-primary bg-primary/5" : isDone ? "border-camp-green/40 bg-camp-green/5" : "border-border hover:border-border/80"
              }`}
            >
              <span className="text-xs text-muted-foreground">{DAY_LABELS[ds.day_number]?.slice(0, 3)}</span>
              <span className="text-lg font-bold">{ds.day_number}</span>
              {isDone ? (
                <Icon icon="check-circle" className="w-4 h-4 text-camp-green" />
              ) : (
                <Icon icon="circle" className="w-4 h-4 text-muted-foreground/30" />
              )}
            </button>
          );
        })}
      </div>

      {/* Team race board */}
      <div className="mb-6">
        <TeamRaceBoard teams={teamProgress} dayNumber={selectedDay} />
      </div>

      {/* States: submitted, locked, or show form */}
      {(submitted || (alreadySubmitted && !isAdmin)) ? (
        <Card className="p-8 text-center border-camp-green/30">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-camp-green/10 mb-4">
            <Icon icon="check-circle-2" className="w-8 h-8 text-camp-green" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            {submitted ? "Survey Submitted!" : `Day ${selectedDay} Completed`}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Thank you for sharing your reflections.</p>
          {submitResult && (
            <div className="flex flex-col items-center gap-2">
              {submitResult.points > 0 && (
                <Badge className="bg-camp-amber/15 text-camp-amber border-camp-amber/30">
                  <Icon icon="star" className="w-3.5 h-3.5 mr-1" /> +{submitResult.points} points
                </Badge>
              )}
              {submitResult.late && (
                <Badge variant="outline" className="text-red-500 border-red-300">
                  <Icon icon="alert-triangle" className="w-3.5 h-3.5 mr-1" /> Late submission (-3 team pts)
                </Badge>
              )}
              {submitResult.teamBonus > 0 && (
                <Badge className="bg-camp-green/15 text-camp-green border-camp-green/30">
                  <Icon icon="trophy" className="w-3.5 h-3.5 mr-1" /> Team race bonus: +{submitResult.teamBonus} pts!
                </Badge>
              )}
            </div>
          )}
        </Card>
      ) : (isLocked && !isAdmin) ? (
        <Card className="p-8 text-center border-red-200">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-50 mb-4">
            <Icon icon="lock" className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-bold mb-2">Survey Locked</h2>
          <p className="text-sm text-muted-foreground">
            The Day {selectedDay} survey deadline has passed. Submissions are no longer accepted.
          </p>
          <p className="text-xs text-red-500 mt-2">-5 points deducted for missed survey</p>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon icon="calendar-off" className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <h2 className="font-semibold mb-1">No Sessions Scheduled</h2>
          <p className="text-sm text-muted-foreground">Day {selectedDay} doesn&apos;t have sessions on the agenda yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Section: Session Ratings */}
          <div className="flex items-center gap-2 mb-1">
            <Icon icon="star" className="w-4 h-4 text-camp-amber" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Rate Each Session ({sessions.length})
            </h2>
          </div>

          {sessions.map((session: { id: number; title: string; session_type: string; start_time: string; end_time: string }) => (
            <SessionScorecard
              key={session.id}
              session={session}
              value={sessionRatings[session.id] ?? { rating: 0, usefulness: 0, comment: "" }}
              onChange={(val) => updateSessionRating(session.id, val)}
            />
          ))}

          {/* Open-ended */}
          <div className="flex items-center gap-2 mt-4 mb-1">
            <Icon icon="message-square" className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your Reflections</h2>
          </div>
          {(surveyData?.open_questions ?? []).map((q: { key: string; label: string; required: boolean }) => (
            <Card key={q.key} className="p-4">
              <p className="text-sm font-medium mb-2">{q.label} {q.required && <span className="text-red-400">*</span>}</p>
              <Textarea placeholder="Your thoughts..." value={openResponses[q.key] ?? ""}
                onChange={(e) => setOpenResponses(prev => ({ ...prev, [q.key]: e.target.value }))} rows={2} className="text-sm" />
            </Card>
          ))}

          {/* Final Day: Overall */}
          {isFinalDay && (
            <>
              <div className="flex items-center gap-2 mt-6 mb-1">
                <Icon icon="award" className="w-4 h-4 text-camp-green" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">cAMP 201 Overall</h2>
              </div>
              <Card className="p-4">
                <p className="text-sm font-medium mb-4">On a scale of 1–5, rate the following:</p>
                <div className="flex flex-col gap-4">
                  {(surveyData?.overall_aspects ?? []).map((a: { key: string; label: string }) => (
                    <div key={a.key}>
                      <p className="text-sm mb-2">{a.label}</p>
                      <div className="flex gap-1">
                        {USEFULNESS_SCALE.map(s => (
                          <button key={s.value} type="button"
                            onClick={() => setOverallRatings(prev => ({ ...prev, [a.key]: s.value }))}
                            className={`flex-1 py-1.5 rounded-lg border text-[10px] font-medium text-center transition-all ${
                              overallRatings[a.key] === s.value ? `${s.color} border-2 scale-105` : "border-border text-muted-foreground hover:bg-muted/30"
                            }`}>{s.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              {(surveyData?.overall_open_questions ?? []).map((q: { key: string; label: string; required: boolean }) => (
                <Card key={q.key} className="p-4">
                  <p className="text-sm font-medium mb-2">{q.label} {q.required && <span className="text-red-400">*</span>}</p>
                  <Textarea placeholder="Your thoughts..." value={overallOpen[q.key] ?? ""}
                    onChange={(e) => setOverallOpen(prev => ({ ...prev, [q.key]: e.target.value }))} rows={2} className="text-sm" />
                </Card>
              ))}
            </>
          )}

          {/* Submit */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <Button onClick={handleSubmit} disabled={submitting || !canSubmit} size="lg" className="w-full max-w-sm">
              {submitting ? <><Icon icon="loader-2" className="w-4 h-4 animate-spin mr-2" />Submitting...</>
                : <><Icon icon="send" className="w-4 h-4 mr-2" />Submit Day {selectedDay} Survey</>}
            </Button>
            {!canSubmit && <p className="text-xs text-muted-foreground">Please rate all sessions{isFinalDay ? " and overall aspects" : ""} to submit</p>}
            <p className="text-xs text-muted-foreground">Earn <span className="font-semibold text-camp-amber">+5 points</span> for completing on time</p>
          </div>
        </div>
      )}
    </div>
  );
}
