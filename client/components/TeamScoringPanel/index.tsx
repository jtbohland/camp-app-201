import { useState, useCallback, useEffect, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import GuestJudgesPanel from "@/components/GuestJudgesPanel/index.js";
import JudgeScoreForm, { type Criterion } from "@/components/JudgeScoreForm/index.js";
import JudgeScoresBreakdown, { type JudgeScore } from "@/components/JudgeScoresBreakdown/index.js";
import ScoreRevealToggle from "@/components/ScoreRevealToggle/index.js";

type Props = {
  presentationId: number;
  rubricTemplateId: number;
  camperId: number;
  isAdmin: boolean;
  scoresRevealed?: boolean;
  onRevealToggle?: () => void;
};

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Request failed";
}

/** Notes drafts survive a refresh mid-presentation. One per judge, rubric, and team. */
const draftKey = (rubricId: number, teamId: number) => `camp201-judge-notes:${rubricId}:${teamId}`;

export default function TeamScoringPanel({ presentationId, rubricTemplateId, camperId, isAdmin, scoresRevealed, onRevealToggle }: Props) {
  const { isGuestJudge } = useIsAdmin();
  const { data: rubricData, loading, refetch } = useApiData("GetRubricTemplate", {
    rubric_template_id: rubricTemplateId,
  });
  const { data: teamsData } = useApiData("GetTeams", {});
  const { run: scoreTeam, loading: scoring } = useApi("ScoreTeamPresentation");

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [mvpCamperId, setMvpCamperId] = useState<string>("");

  const template = rubricData?.template;
  const criteria = (template?.criteria ?? []) as Criterion[];
  const teams = (teamsData?.teams ?? []) as { id: number; name: string; members?: { id: number; first_name: string; last_name: string }[] }[];
  const maxTotal = template?.max_total_points ?? 15;
  const allScores = (rubricData?.scores ?? []) as (JudgeScore & { judge_email: string | null; scores: unknown })[];
  const myEmail = rubricData?.myEmail ?? "";
  const judgeCount = rubricData?.judgeCount ?? 0;

  // Scores the signed-in judge has already given, keyed by team
  const myScores = useMemo(
    () => new Map(allScores.filter((s) => s.judge_email && s.judge_email === myEmail).map((s) => [s.team_id, s])),
    [allScores, myEmail],
  );
  const myScoreForTeam = selectedTeam !== null ? myScores.get(selectedTeam) : undefined;
  const selectedTeamMembers = selectedTeam !== null ? teams.find((t) => t.id === selectedTeam)?.members ?? [] : [];

  // Keep the notes draft on this device while the judge types
  useEffect(() => {
    if (selectedTeam === null) return;
    const key = draftKey(rubricTemplateId, selectedTeam);
    if (notes) localStorage.setItem(key, notes);
    else localStorage.removeItem(key);
  }, [notes, selectedTeam, rubricTemplateId]);

  const handleSelectTeam = useCallback((teamId: number) => {
    const mine = myScores.get(teamId);
    setSelectedTeam(teamId);
    setMvpCamperId("");
    // Re-opening a team you scored loads your score and notes so you can edit them
    const saved = mine?.scores && typeof mine.scores === "object" ? (mine.scores as Record<string, number>) : {};
    setScores(typeof mine?.scores === "string" ? JSON.parse(mine.scores) : saved);
    setNotes(localStorage.getItem(draftKey(rubricTemplateId, teamId)) ?? mine?.notes ?? "");
  }, [myScores, rubricTemplateId]);

  const handleScore = useCallback((criterionName: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionName]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedTeam === null || Object.keys(scores).length < criteria.length) {
      toast.error("Please score all criteria before submitting");
      return;
    }
    try {
      const result = await scoreTeam({
        presentation_id: presentationId,
        rubric_template_id: rubricTemplateId,
        team_id: selectedTeam,
        scorer_camper_id: camperId || null,
        scores: JSON.stringify(scores),
        notes: notes.trim() || null,
        mvp_camper_id: mvpCamperId ? Number(mvpCamperId) : null,
      });
      if (result?.success) {
        toast.success(result.message);
        localStorage.removeItem(draftKey(rubricTemplateId, selectedTeam));
        setSelectedTeam(null);
        setScores({});
        setNotes("");
        setMvpCamperId("");
        await refetch();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [selectedTeam, scores, notes, presentationId, rubricTemplateId, camperId, scoreTeam, criteria.length, mvpCamperId, refetch]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading rubric…</div>;
  if (!template) return <div className="p-4 text-sm text-muted-foreground">No rubric found.</div>;

  return (
    <div className="space-y-6">
      {/* Section 1: Rubric criteria — everyone sees this */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon icon="clipboard-check" className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-base text-foreground">Scoring Rubric</h3>
          <span className="text-xs text-muted-foreground ml-auto">Max {maxTotal} pts per judge</span>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
          <Icon icon="award" className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <p>
            <strong>MVP — Most Valuable Presenter</strong> may be awarded if a judge feels someone
            truly carried the team or exceeded expectations. Not guaranteed — focus on team success,
            not outshining your teammates.
          </p>
        </div>

        {criteria.map((c, i) => (
          <Card key={i} className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2.5">{c.name}</h4>
            <div className="grid grid-cols-3 gap-2">
              {c.levels.map((l, li) => {
                const tone = li === c.levels.length - 1 ? "green" : li === Math.floor(c.levels.length / 2) ? "amber" : "red";
                const box = { green: "border-green-200 bg-green-50/50", amber: "border-amber-200 bg-amber-50/50", red: "border-red-200 bg-red-50/50" }[tone];
                const dot = { green: "bg-green-200 text-green-700", amber: "bg-amber-200 text-amber-700", red: "bg-red-200 text-red-700" }[tone];
                return (
                  <div key={l.score} className={`p-2.5 rounded-lg text-xs border ${box}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${dot}`}>{l.score}</span>
                      <span className="font-semibold text-foreground">{l.label}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{l.desc}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Section 2: Score Teams — counselors and guest judges only */}
      {isAdmin && (
        <div className="space-y-3 pt-4 border-t-2 border-dashed border-violet-200">
          <div className="flex items-center gap-2">
            <Icon icon="trophy" className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-foreground">Score Teams</h3>
            <span className="text-[10px] text-muted-foreground bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full font-semibold ml-1">
              Judges Only
            </span>
          </div>

          <GuestJudgesPanel maxPerJudge={maxTotal} judgeCount={judgeCount} canManage={!isGuestJudge} />

          <JudgeScoresBreakdown
            teamTotals={rubricData?.teamTotals ?? []}
            scores={allScores}
            judgeCount={judgeCount}
            maxPerJudge={maxTotal}
          />

          {/* Team selector: a check means you've already scored that team */}
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <Button
                key={t.id}
                variant={selectedTeam === t.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelectTeam(t.id)}
                className="text-xs"
              >
                {t.name}
                {myScores.has(t.id) && <Icon icon="check" className="w-3 h-3 ml-1 text-green-500" />}
              </Button>
            ))}
          </div>

          {selectedTeam !== null && (
            <JudgeScoreForm
              teamName={teams.find((t) => t.id === selectedTeam)?.name ?? "Team"}
              criteria={criteria}
              maxTotal={maxTotal}
              scores={scores}
              onScore={handleScore}
              notes={notes}
              onNotesChange={setNotes}
              members={selectedTeamMembers}
              mvpCamperId={mvpCamperId}
              onMvpChange={setMvpCamperId}
              isRescore={!!myScoreForTeam}
              saving={scoring}
              onSubmit={handleSubmit}
            />
          )}

          {onRevealToggle && allScores.length > 0 && !isGuestJudge && (
            <ScoreRevealToggle revealed={!!scoresRevealed} scoreCount={allScores.length} onToggle={onRevealToggle} />
          )}
        </div>
      )}
    </div>
  );
}
