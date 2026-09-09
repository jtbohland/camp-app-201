import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
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
};

export default function TeamScoringPanel({ presentationId, rubricTemplateId, camperId, isAdmin }: Props) {
  const { data: rubricData, loading, refetch } = useApiData("GetRubricTemplate", {
    rubric_template_id: rubricTemplateId,
  });
  const { data: teamsData } = useApiData("GetTeams", {});
  const { run: scoreTeam, loading: scoring } = useApi("ScoreTeamPresentation");

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

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
    if (!selectedTeam) return;
    if (Object.keys(scores).length < criteria.length) {
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
        notes: notes || null,
      });
      if (result?.success) {
        toast.success(result.message);
        setSelectedTeam(null);
        setScores({});
        setNotes("");
        refetch();
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [selectedTeam, scores, notes, presentationId, rubricTemplateId, camperId, scoreTeam, criteria.length, refetch]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading rubric…</div>;
  if (!template) return <div className="p-4 text-sm text-muted-foreground">No rubric found.</div>;

  // Camper view — just show rubric criteria (read-only)
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200">
          <h3 className="font-bold text-sm text-foreground mb-1">{template.name}</h3>
          <p className="text-xs text-muted-foreground">Max {maxTotal} points • {criteria.length} criteria</p>
        </Card>
        {criteria.map((c, i) => (
          <Card key={i} className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">{c.name}</h4>
            <div className="space-y-1.5">
              {c.levels.map((l) => (
                <div key={l.score} className="flex gap-2 text-xs">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    l.score === 3 ? "bg-green-100 text-green-700" : l.score === 2 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  }`}>{l.score}</span>
                  <div>
                    <span className="font-medium text-foreground">{l.label}: </span>
                    <span className="text-muted-foreground">{l.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Admin view — score teams
  return (
    <div className="space-y-4">
      {/* Existing scores summary */}
      {existingScores.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon icon="trophy" className="w-4 h-4 text-amber-500" />
            Scores Awarded
          </h3>
          <div className="space-y-2">
            {existingScores.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                <span className="font-medium">{s.team_name}</span>
                <span className="font-bold text-primary">{s.total_score}/{s.max_score}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Team selector */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Score a Team</h3>
        <div className="flex flex-wrap gap-2">
          {teams.map((t: any) => {
            const alreadyScored = scoredTeamIds.has(t.id);
            return (
              <Button
                key={t.id}
                variant={selectedTeam === t.id ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedTeam(t.id); setScores({}); setNotes(""); }}
                className="text-xs"
              >
                {t.name}
                {alreadyScored && <Icon icon="check" className="w-3 h-3 ml-1 text-green-500" />}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Rubric scoring form */}
      {selectedTeam && (
        <>
          {criteria.map((c, i) => (
            <Card key={i} className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">{c.name}</h4>
              <div className="grid grid-cols-3 gap-2">
                {c.levels.map((l) => {
                  const isSelected = scores[c.name] === l.score;
                  return (
                    <button
                      key={l.score}
                      onClick={() => handleScore(c.name, l.score)}
                      className={`p-3 rounded-lg border text-left transition-all text-xs ${
                        isSelected
                          ? l.score === 3 ? "border-green-500 bg-green-50 dark:bg-green-950/20 ring-2 ring-green-300"
                            : l.score === 2 ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-2 ring-amber-300"
                            : "border-red-500 bg-red-50 dark:bg-red-950/20 ring-2 ring-red-300"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          l.score === 3 ? "bg-green-100 text-green-700" : l.score === 2 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        }`}>{l.score}</span>
                        <span className="font-semibold">{l.label}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{l.desc}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* Notes + submit */}
          <Card className="p-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this team..."
              rows={2}
              className="text-sm mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                Total: <span className="text-primary text-lg">{currentTotal}</span>/{maxTotal}
              </span>
              <Button onClick={handleSubmit} disabled={scoring || Object.keys(scores).length < criteria.length}>
                {scoring ? "Saving…" : "Submit Score"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
