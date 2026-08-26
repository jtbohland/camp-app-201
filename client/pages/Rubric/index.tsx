import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import RubricScoreHistory from "@/components/RubricScoreHistory";

interface Criterion {
  id: string;
  name: string;
  description: string;
  max_score: number;
}

export default function RubricPage() {
  const user = useSuperblocksUser();

  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { data: templatesData, loading: loadingTemplates } = useApiData("GetRubricTemplates", {});
  const { data: teamsData, loading: loadingTeams } = useApiData("GetAdminTeams", { cohort_id: null });
  const { run: submitScore, loading: submitting } = useApi("SubmitRubricScore");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<{ total_score: number; max_score: number; points_awarded: number } | null>(null);

  const templates = templatesData?.templates ?? [];
  const teams = teamsData?.teams ?? [];

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id.toString() === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const totalScore = useMemo(
    () => Object.values(scores).reduce((sum, s) => sum + s, 0),
    [scores]
  );

  const maxScore = selectedTemplate?.max_total_points ?? 100;

  const handleScoreChange = useCallback((criterionId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedTemplate || !selectedTeamId || !camperData?.camper?.id) return;
    try {
      const result = await submitScore({
        template_id: selectedTemplate.id,
        team_id: Number(selectedTeamId),
        scored_by: camperData.camper.id,
        scores,
        notes: notes || null,
      });
      if (result && typeof result === "object" && "success" in result && result.success) {
        const r = result as { total_score: number; max_score: number; points_awarded: number };
        setLastResult({ total_score: r.total_score, max_score: r.max_score, points_awarded: r.points_awarded });
        setSubmitted(true);
        toast.success(`Score submitted! ${r.points_awarded} points awarded to team.`);
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Error submitting score: " + message);
    }
  }, [selectedTemplate, selectedTeamId, camperData, scores, notes, submitScore]);

  const handleReset = useCallback(() => {
    setScores({});
    setNotes("");
    setSelectedTeamId("");
    setSubmitted(false);
    setLastResult(null);
  }, []);

  if (loadingTemplates || loadingTeams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-900 to-green-950 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-900 to-green-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Icon name="clipboard-check" className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Presentation Rubric</h1>
            <p className="text-sm text-white/60">Score team presentations in real-time</p>
          </div>
        </div>

        {submitted && lastResult ? (
          /* Success State */
          <Card className="p-8 bg-white/95 border-0 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Icon name="check-circle" className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Score Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Team scored <span className="font-bold text-emerald-700">{lastResult.total_score}/{lastResult.max_score}</span>
            </p>
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 mb-6">
              <Icon name="star" className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-amber-800">+{lastResult.points_awarded} points awarded to each team member</span>
            </div>
            <div>
              <Button onClick={handleReset} className="bg-emerald-700 hover:bg-emerald-800">
                <Icon name="plus" className="w-4 h-4 mr-2" />
                Score Another Team
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Rubric & Team Selectors */}
            <Card className="p-5 bg-white/95 border-0 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Rubric Template</label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rubric..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Team</label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name} ({t.member_count} members)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Scoring Form */}
            {selectedTemplate && selectedTeamId && (
              <>
                <Card className="p-5 bg-white/95 border-0 shadow-lg space-y-5">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Icon name="sliders-horizontal" className="w-4 h-4 text-emerald-600" />
                    Score Each Criterion
                  </h3>
                  {(selectedTemplate.criteria as Criterion[]).map((criterion) => (
                    <div key={criterion.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{criterion.name}</span>
                          <p className="text-xs text-gray-500">{criterion.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-emerald-700 w-8 text-right">
                            {scores[criterion.id] ?? 0}
                          </span>
                          <span className="text-xs text-gray-400">/ {criterion.max_score}</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={criterion.max_score}
                        step={1}
                        value={scores[criterion.id] ?? 0}
                        onChange={(e) => handleScoreChange(criterion.id, Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>0</span>
                        <span>{criterion.max_score}</span>
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total Score</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${totalScore >= maxScore * 0.8 ? "text-emerald-600" : totalScore >= maxScore * 0.5 ? "text-amber-600" : "text-red-500"}`}>
                        {totalScore}
                      </span>
                      <span className="text-sm text-gray-400">/ {maxScore}</span>
                    </div>
                  </div>
                </Card>

                {/* Notes + Submit */}
                <Card className="p-5 bg-white/95 border-0 shadow-lg space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes (optional)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Feedback for the team..."
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || totalScore === 0}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Icon name="loader-2" className="w-4 h-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Icon name="send" className="w-4 h-4" />
                        Submit Score & Award Points
                      </span>
                    )}
                  </Button>
                </Card>
              </>
            )}
          </>
        )}

        {/* Score History */}
        <RubricScoreHistory />
      </div>
    </div>
  );
}
