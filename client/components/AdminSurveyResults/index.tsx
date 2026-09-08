import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };

const OPEN_Q_LABELS: Record<string, string> = {
  highlight: "Highlights",
  improve: "Improvements",
  anything_else: "Other Thoughts",
  remove_session: "Sessions to Remove",
  add_session: "Sessions to Add",
  most_valuable: "Most Valuable",
  overall_thoughts: "Overall Thoughts",
};

const ASPECT_LABELS: Record<string, string> = {
  in_person_value: "In-Person Value",
  team_collab: "Team Collaboration",
  guest_speakers: "Guest Speakers",
  info_activity_balance: "Info vs. Activity Balance",
  onboarding_placement: "Onboarding Placement",
  facilitators: "Facilitators",
  being_in_hq: "Being in HQ",
};

type AdminSurveyResultsProps = {
  numDays?: number;
};

export default function AdminSurveyResults({ numDays = 4 }: AdminSurveyResultsProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [viewMode, setViewMode] = useState<"overview" | "responses">("overview");

  const { data, loading, fetching } = useApiData("GetDailySurveyResults", {
    day_number: selectedDay,
    manager_email: null,
  });

  const completion = data?.completion;
  const sessionAvgs = data?.session_averages ?? [];
  const camperSubs = data?.camper_submissions ?? [];
  const openResponses = data?.open_responses ?? [];
  const overallAvgs = data?.overall_averages ?? [];

  // Group open responses by question key
  const groupedOpen = useMemo(() => {
    const groups: Record<string, { camper_name: string; response: string }[]> = {};
    openResponses.forEach((r: { question_key: string; camper_name: string; response: string }) => {
      if (!groups[r.question_key]) groups[r.question_key] = [];
      groups[r.question_key].push({ camper_name: r.camper_name, response: r.response });
    });
    return groups;
  }, [openResponses]);

  const handleExportCsv = useCallback(() => {
    const rows: string[][] = [];
    // Header
    rows.push(["Camper", "Submitted At", "Points", "Session", "Rating (1-5)", "Usefulness (1-5)", "Comment"]);
    // Data rows
    camperSubs.forEach((sub: { camper_name: string; submitted_at: string; points_awarded: number; ratings: { session_title: string; rating: number; usefulness: number; comment: string }[] }) => {
      sub.ratings.forEach(r => {
        rows.push([sub.camper_name, sub.submitted_at, String(sub.points_awarded), r.session_title, String(r.rating), String(r.usefulness), r.comment]);
      });
    });
    // Open responses section
    rows.push([]);
    rows.push(["--- Open Responses ---"]);
    rows.push(["Question", "Camper", "Response"]);
    openResponses.forEach((r: { question_key: string; camper_name: string; response: string }) => {
      rows.push([OPEN_Q_LABELS[r.question_key] ?? r.question_key, r.camper_name, r.response]);
    });

    const csv = rows.map(row => row.map(cell => `"${(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `camp201_survey_day${selectedDay}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [camperSubs, openResponses, selectedDay]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-32 bg-white/10" /><Skeleton className="h-48 bg-white/10" /></div>;
  }

  return (
    <div className={`flex flex-col gap-6 ${fetching ? "opacity-70" : ""}`}>
      {/* Day selector */}
      <div className="flex items-center gap-2">
        {Array.from({ length: numDays }, (_, i) => i + 1).map(d => (
          <Button key={d} size="sm" variant="ghost"
            onClick={() => setSelectedDay(d)}
            className={`text-white ${selectedDay === d ? "bg-white/20" : "hover:bg-white/10"}`}>
            Day {d} ({DAY_LABELS[d]})
          </Button>
        ))}
        <div className="ml-auto flex bg-white/10 rounded-lg p-0.5">
          <Button size="sm" variant="ghost" onClick={() => setViewMode("overview")}
            className={`text-white text-xs ${viewMode === "overview" ? "bg-white/20" : ""}`}>
            <Icon icon="bar-chart-3" className="w-3.5 h-3.5 mr-1" />Overview
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setViewMode("responses")}
            className={`text-white text-xs ${viewMode === "responses" ? "bg-white/20" : ""}`}>
            <Icon icon="list" className="w-3.5 h-3.5 mr-1" />Responses
          </Button>
        </div>
        <Button size="sm" variant="ghost" onClick={handleExportCsv}
          className="text-white hover:bg-white/10 text-xs ml-2">
          <Icon icon="download" className="w-3.5 h-3.5 mr-1" />Export CSV
        </Button>
      </div>

      {/* Completion stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-white/10 border-white/10">
          <div className="text-3xl font-bold text-white">{completion?.submitted ?? 0}</div>
          <div className="text-sm text-white/60">Submitted</div>
        </Card>
        <Card className="p-4 bg-white/10 border-white/10">
          <div className="text-3xl font-bold text-white">{completion?.total_campers ?? 0}</div>
          <div className="text-sm text-white/60">Total cAMPers</div>
        </Card>
        <Card className="p-4 bg-white/10 border-white/10">
          <div className="text-3xl font-bold text-white">{completion?.completion_pct ?? 0}%</div>
          <div className="text-sm text-white/60">Completion Rate</div>
        </Card>
      </div>

      {viewMode === "overview" ? (
        <>
          {/* Session averages — bar chart style */}
          <Card className="bg-white/5 border-white/10 p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Icon icon="bar-chart-3" className="w-4 h-4" />
              Session Scores (Avg)
            </h3>
            {sessionAvgs.length === 0 ? (
              <p className="text-white/50 text-sm">No ratings yet for Day {selectedDay}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {sessionAvgs.map((s: { session_title: string; session_type: string; avg_rating: number; avg_usefulness: number; response_count: number }) => (
                  <div key={s.session_title}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium truncate flex-1 mr-2">{s.session_title}</span>
                      <span className="text-white/50 text-xs">{s.response_count} responses</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/50 w-12">Rating</span>
                          <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-camp-amber/80 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${(s.avg_rating / 5) * 100}%` }}>
                              <span className="text-[10px] font-bold text-white">{s.avg_rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/50 w-12">Useful</span>
                          <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-camp-green/80 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${(s.avg_usefulness / 5) * 100}%` }}>
                              <span className="text-[10px] font-bold text-white">{s.avg_usefulness.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Overall program ratings (final day) */}
          {overallAvgs.length > 0 && (
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Icon icon="award" className="w-4 h-4" />
                Overall Program Ratings
              </h3>
              <div className="flex flex-col gap-3">
                {overallAvgs.map((a: { aspect_key: string; avg_rating: number; response_count: number }) => (
                  <div key={a.aspect_key} className="flex items-center gap-3">
                    <span className="text-white text-sm flex-1">{ASPECT_LABELS[a.aspect_key] ?? a.aspect_key}</span>
                    <div className="w-40 h-5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400/80 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(a.avg_rating / 5) * 100}%` }}>
                        <span className="text-[10px] font-bold text-white">{a.avg_rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Open-ended responses grouped */}
          {Object.keys(groupedOpen).length > 0 && (
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Icon icon="message-square" className="w-4 h-4" />
                Open Responses
              </h3>
              <div className="flex flex-col gap-4">
                {Object.entries(groupedOpen).map(([key, responses]) => (
                  <div key={key}>
                    <h4 className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-2">
                      {OPEN_Q_LABELS[key] ?? key} ({responses.length})
                    </h4>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {responses.map((r, i) => (
                        <div key={i} className="text-sm text-white/80 px-3 py-2 rounded bg-white/5">
                          <span className="text-white/50 text-xs">{r.camper_name}:</span>{" "}
                          {r.response}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        /* Individual responses view */
        <Card className="bg-white/5 border-white/10">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-semibold">Individual Submissions ({camperSubs.length})</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {camperSubs.length === 0 ? (
              <div className="p-8 text-center text-white/50">No submissions yet</div>
            ) : (
              camperSubs.map((sub: { camper_id: number; camper_name: string; submitted_at: string; points_awarded: number; ratings: { session_title: string; rating: number; usefulness: number; comment: string }[] }) => (
                <details key={sub.camper_id} className="group">
                  <summary className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{sub.camper_name}</span>
                      <Badge className="bg-white/10 text-white/60 text-[10px]">+{sub.points_awarded} pts</Badge>
                    </div>
                    <span className="text-white/40 text-xs">{new Date(sub.submitted_at).toLocaleString()}</span>
                  </summary>
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-white/40 uppercase tracking-wide mb-1 px-2">
                      <span>Session</span><span className="text-center">Rating</span><span className="text-center">Useful</span>
                    </div>
                    {sub.ratings.map((r, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 text-sm text-white/80 px-2 py-1 rounded hover:bg-white/5">
                        <span className="truncate">{r.session_title}</span>
                        <span className="text-center">{["","😞","😕","😐","🙂","🤩"][r.rating]}</span>
                        <span className="text-center">{r.usefulness}/5</span>
                      </div>
                    ))}
                    {sub.ratings.some(r => r.comment) && (
                      <div className="mt-2 px-2">
                        {sub.ratings.filter(r => r.comment).map((r, i) => (
                          <p key={i} className="text-xs text-white/50 italic">💬 {r.session_title}: {r.comment}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
