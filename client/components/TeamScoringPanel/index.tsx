import { useState, useCallback, useEffect, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import GuestJudgesPanel from "@/components/GuestJudgesPanel/index.js";
import JudgeScoreForm, { type Criterion } from "@/components/JudgeScoreForm/index.js";
import JudgeScoresBreakdown, { type JudgeScore } from "@/components/JudgeScoresBreakdown/index.js";
import ScoreRevealToggle from "@/components/ScoreRevealToggle/index.js";
import RubricCriterionCard from "@/components/RubricCriterionCard/index.js";
import JudgeTeamPicker from "@/components/JudgeTeamPicker/index.js";

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

  // Judges land on the first team they haven't scored, so the rubric tiles are ready to tap.
  useEffect(() => {
    if (!isAdmin || selectedTeam !== null || !rubricData || teams.length === 0) return;
    const next = teams.find((t) => !myScores.has(t.id)) ?? teams[0];
    handleSelectTeam(next.id);
  }, [isAdmin, selectedTeam, rubricData, teams, myScores, handleSelectTeam]);

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
        // Move straight on to the next team this judge hasn't scored yet.
        const next = teams.find((t) => t.id !== selectedTeam && !myScores.has(t.id));
        await refetch();
        if (next) {
          handleSelectTeam(next.id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setNotes("");
        }
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [selectedTeam, scores, notes, presentationId, rubricTemplateId, camperId, scoreTeam, criteria.length, mvpCamperId, refetch, teams, myScores, handleSelectTeam]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading rubric…</div>;
  if (!template) return <div className="p-4 text-sm text-muted-foreground">No rubric found.</div>;

  const judging = isAdmin && selectedTeam !== null;

  return (
    <div className="space-y-6">
      {/* 1. Header + team buttons (judges) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon icon="clipboard-check" className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-base text-foreground">Scoring Rubric</h3>
          {isAdmin && (
            <span className="text-[10px] text-muted-foreground bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full font-semibold">
              Tap a tile to score
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">Max {maxTotal} pts per judge</span>
        </div>

        {isAdmin && (
          <div className="sticky top-0 z-10 -mx-1 rounded-lg bg-background/95 px-1 py-2 backdrop-blur">
            <JudgeTeamPicker
              teams={teams}
              selectedTeamId={selectedTeam}
              scoredTeamIds={new Set(myScores.keys())}
              onSelect={handleSelectTeam}
            />
          </div>
        )}

        {!isAdmin && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <Icon icon="award" className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <p>
              <strong>MVP — Most Valuable Presenter</strong> may be awarded if a judge feels someone
              truly carried the team or exceeded expectations. Not guaranteed — focus on team success,
              not outshining your teammates.
            </p>
          </div>
        )}
      </div>

      {/* 2. Rubric tiles: clickable for judges, read-only for cAMPers */}
      <div className="space-y-3">
        {criteria.map((c) => (
          <RubricCriterionCard
            key={c.name}
            criterion={c}
            selected={judging ? scores[c.name] : undefined}
            onSelect={judging ? (value) => handleScore(c.name, value) : undefined}
          />
        ))}
      </div>

      {isAdmin && (
        <div className="space-y-4">
          {/* 3. Judge's notes, MVP, and team total */}
          {judging && (
            <JudgeScoreForm
              teamName={teams.find((t) => t.id === selectedTeam)?.name ?? "Team"}
              criteria={criteria}
              maxTotal={maxTotal}
              scores={scores}
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

          <JudgeScoresBreakdown
            teamTotals={rubricData?.teamTotals ?? []}
            scores={allScores}
            judgeCount={judgeCount}
            maxPerJudge={maxTotal}
          />

          {onRevealToggle && allScores.length > 0 && !isGuestJudge && (
            <ScoreRevealToggle revealed={!!scoresRevealed} scoreCount={allScores.length} onToggle={onRevealToggle} />
          )}

          {/* 4. Guest judges */}
          <div className="pt-4 border-t-2 border-dashed border-violet-200">
            <GuestJudgesPanel maxPerJudge={maxTotal} judgeCount={judgeCount} canManage={!isGuestJudge} />
          </div>
        </div>
      )}
    </div>
  );
}
