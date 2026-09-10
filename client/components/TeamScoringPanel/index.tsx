import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type Criterion = {
  name: string;
  levels: { score: number; label: string; desc: string }[];
};

type Props = {
  presentationId: number;
  rubricTemplateId: number;
  camperId: number;
  isAdmin: boolean;
  scoresRevealed?: boolean;
  onRevealToggle?: () => void;
};

export default function TeamScoringPanel({ presentationId, rubricTemplateId, camperId, isAdmin, scoresRevealed, onRevealToggle }: Props) {
  const { data: rubricData, loading, refetch } = useApiData("GetRubricTemplate", {
    rubric_template_id: rubricTemplateId,
  });
  const { data: teamsData } = useApiData("GetTeams", {});
  const { run: scoreTeam, loading: scoring } = useApi("ScoreTeamPresentation");

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const template = rubricData?.template;
  const existingScores = (rubricData?.scores ?? []) as any[];
  const criteria = (template?.criteria ?? []) as Criterion[];
  const teams = (teamsData?.teams ?? []) as any[];
  const maxTotal = template?.max_total_points ?? 15;
  const currentTotal = Object.values(scores).reduce((sum, v) => sum + v, 0);
  const scoredTeamIds = new Set(existingScores.map((s: any) => s.team_id));

  const handleScore = useCallback((criterionName: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionName]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedTeam || Object.keys(scores).length < criteria.length) {
      toast.error("Please score all criteria before submitting");
      return;
    }
    try {
      const result = await scoreTeam({
        presentation_id: presentationId,
        rubric_template_id: rubricTemplateId,
        team_id: selectedTeam,
        scorer_camper_id: camperId,
        scores: JSON.stringify(scores),
        notes: null,
      });
      if (result?.success) {
        toast.success(result.message);
        setSelectedTeam(null);
        setScores({});
        refetch();
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [selectedTeam, scores, presentationId, rubricTemplateId, camperId, scoreTeam, criteria.length, refetch]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading rubric…</div>;
  if (!template) return <div className="p-4 text-sm text-muted-foreground">No rubric found.</div>;

  return (
    <div className="space-y-6">
      {/* Section 1: Rubric criteria — everyone sees this */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon icon="clipboard-check" className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-base text-foreground">Scoring Rubric</h3>
          <span className="text-xs text-muted-foreground ml-auto">Max {maxTotal} pts</span>
        </div>

        {criteria.map((c, i) => (
          <Card key={i} className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2.5">{c.name}</h4>
            <div className="grid grid-cols-3 gap-2">
              {c.levels.map((l, li) => (
                <div key={l.score} className={`p-2.5 rounded-lg text-xs border ${
                  li === c.levels.length - 1 ? "border-green-200 bg-green-50/50 dark:bg-green-950/10"
                  : li === Math.floor(c.levels.length / 2) ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10"
                  : "border-red-200 bg-red-50/50 dark:bg-red-950/10"
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      li === c.levels.length - 1 ? "bg-green-200 text-green-700" : li === Math.floor(c.levels.length / 2) ? "bg-amber-200 text-amber-700" : "bg-red-200 text-red-700"
                    }`}>{l.score}</span>
                    <span className="font-semibold text-foreground">{l.label}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{l.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Section 2: Score Teams — admin only */}
      {isAdmin && (
        <div className="space-y-3 pt-4 border-t-2 border-dashed border-violet-200">
          <div className="flex items-center gap-2">
            <Icon icon="trophy" className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-foreground">Score Teams</h3>
            <span className="text-[10px] text-muted-foreground bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full font-semibold ml-1">
              Counselors Only
            </span>
          </div>

          {/* Existing scores */}
          {existingScores.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/10 dark:to-yellow-950/10 border-amber-200">
              <h4 className="text-xs font-bold uppercase text-amber-700 mb-2">Scores Awarded</h4>
              {existingScores.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-amber-200/50 last:border-0">
                  <span className="font-medium">{s.team_name}</span>
                  <span className="font-bold text-amber-700">{s.total_score}/{s.max_score}</span>
                </div>
              ))}
            </Card>
          )}

          {/* Team selector */}
          <div className="flex flex-wrap gap-2">
            {teams.map((t: any) => {
              const alreadyScored = scoredTeamIds.has(t.id);
              return (
                <Button
                  key={t.id}
                  variant={selectedTeam === t.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedTeam(t.id); setScores({}); }}
                  className="text-xs"
                >
                  {t.name}
                  {alreadyScored && <Icon icon="check" className="w-3 h-3 ml-1 text-green-500" />}
                </Button>
              );
            })}
          </div>

          {/* Inline scoring — tap score per criterion */}
          {selectedTeam && (
            <Card className="p-4 border-violet-200 bg-violet-50/30 dark:bg-violet-950/10">
              <h4 className="text-sm font-semibold mb-3">
                Scoring: {teams.find((t: any) => t.id === selectedTeam)?.name}
              </h4>
              <div className="space-y-3">
                {criteria.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground flex-1">{c.name}</span>
                    <div className="flex gap-1.5">
                      {c.levels.map((l) => {
                        const sel = scores[c.name] === l.score;
                        return (
                          <button
                            key={l.score}
                            onClick={() => handleScore(c.name, l.score)}
                            className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${
                              sel
                                ? "bg-primary text-white shadow-md"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {l.score}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-violet-200">
                <span className="text-sm font-bold">
                  Total: <span className="text-xl text-primary">{currentTotal}</span>/{maxTotal}
                </span>
                <Button onClick={handleSubmit} disabled={scoring || Object.keys(scores).length < criteria.length} size="sm">
                  {scoring ? "Saving…" : "Submit Score"}
                </Button>
              </div>
            </Card>
          )}

          {/* Score Reveal Toggle — for EBR / capstone presentations */}
          {onRevealToggle && existingScores.length > 0 && (
            <Card className={`p-4 border-2 ${
              scoresRevealed
                ? "border-green-400 bg-green-50/50"
                : "border-amber-400 bg-amber-50/50"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{scoresRevealed ? "🏆" : "🔒"}</span>
                  <div>
                    <h4 className="font-bold text-sm">
                      {scoresRevealed ? "Scores Revealed!" : "Scores Locked"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {scoresRevealed
                        ? "All EBR scores are visible on the leaderboard"
                        : `${existingScores.length} score(s) submitted — reveal when all teams have presented`
                      }
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={scoresRevealed ? "outline" : "default"}
                  onClick={onRevealToggle}
                  className={scoresRevealed ? "" : "bg-amber-600 hover:bg-amber-700"}
                >
                  {scoresRevealed ? "Re-lock Scores" : "🏆 Reveal Scores"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
