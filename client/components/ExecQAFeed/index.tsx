import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type ExecQAFeedProps = {
  executiveId: number;
  executiveName: string;
  camperId: number;
  camperTeamId: number | null;
  isLocked: boolean;
  onBack: () => void;
};

export default function ExecQAFeed({ executiveId, executiveName, camperId, camperTeamId, isLocked, onBack }: ExecQAFeedProps) {
  const { data, loading, fetching, refetch } = useApiData("GetExecQuestions", {
    executive_id: executiveId,
    camper_id: camperId,
  }, { refetchInterval: 10_000 });

  const { run: submitQuestion, loading: submitting } = useApi("SubmitExecQuestion");
  const { run: voteQuestion } = useApi("VoteExecQuestion");

  const [newQuestion, setNewQuestion] = useState("");

  const questions = (data?.questions ?? []) as any[];

  const handleSubmit = useCallback(async () => {
    if (!newQuestion.trim() || newQuestion.length < 5) {
      toast.error("Question must be at least 5 characters");
      return;
    }
    try {
      const result = await submitQuestion({ executive_id: executiveId, camper_id: camperId, question_text: newQuestion.trim() });
      if (result && typeof result === "object" && "success" in result && !(result as any).success) {
        toast.error((result as any).message || "Failed");
        return;
      }
      setNewQuestion("");
      toast.success("Question submitted! +2 pts");
      refetch();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
      toast.error(message);
    }
  }, [newQuestion, executiveId, camperId, submitQuestion, refetch]);

  const handleVote = useCallback(async (questionId: number, vote: number) => {
    try {
      const result = await voteQuestion({ question_id: questionId, voter_id: camperId, vote });
      if (result && typeof result === "object" && "success" in result && !(result as any).success) {
        toast.error((result as any).message || "Can't vote");
        return;
      }
      refetch();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
      toast.error(message);
    }
  }, [camperId, voteQuestion, refetch]);

  const myQuestionCount = questions.filter((q: any) => q.submitted_by === camperId).length;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <Icon icon="arrow-left" className="w-4 h-4" />
        Back to Speakers
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Q&A: {executiveName}</h2>
        {isLocked && (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <Icon icon="lock" className="w-3 h-3 mr-1" /> Session ended
          </Badge>
        )}
      </div>

      {!isLocked && (
        <Card className="p-4 border-camp-green/30 bg-camp-green/5">
          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a great question..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={submitting}
            />
            <Button onClick={handleSubmit} disabled={submitting || myQuestionCount >= 5} size="sm">
              {submitting ? "..." : "Submit"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {myQuestionCount}/5 questions used · +2 pts per question · +1 pt per vote received
          </p>
        </Card>
      )}

      {fetching && !loading && <p className="text-xs text-muted-foreground">Updating...</p>}

      <div className="space-y-2">
        {questions.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">No questions yet. Be the first!</p>
        )}
        {questions.map((q: any, idx: number) => {
          const isOwn = q.submitted_by === camperId;
          const isSameTeam = camperTeamId && q.submitter_team_id === camperTeamId;
          const canVote = !isOwn && !isSameTeam && !isLocked;

          return (
            <Card key={q.id} className={`p-3 flex gap-3 ${idx === 0 && q.vote_count > 0 ? "border-amber-400 bg-amber-50/50" : ""} ${q.is_asked ? "border-green-400 bg-green-50/50" : ""}`}>
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => canVote && handleVote(q.id, 1)}
                  disabled={!canVote}
                  className={`p-0.5 rounded transition-colors ${q.user_vote === 1 ? "text-camp-green" : "text-muted-foreground"} ${canVote ? "hover:text-camp-green" : "opacity-40"}`}
                >
                  <Icon icon="chevron-up" className="w-4 h-4" />
                </button>
                <span className={`text-sm font-bold ${q.vote_count > 0 ? "text-camp-green" : q.vote_count < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {q.vote_count}
                </span>
                <button
                  onClick={() => canVote && handleVote(q.id, -1)}
                  disabled={!canVote}
                  className={`p-0.5 rounded transition-colors ${q.user_vote === -1 ? "text-red-500" : "text-muted-foreground"} ${canVote ? "hover:text-red-500" : "opacity-40"}`}
                >
                  <Icon icon="chevron-down" className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{q.question_text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {q.submitter_name} {isOwn && "(you)"} {q.is_asked && "✅ Asked!"}
                  {idx === 0 && q.vote_count > 0 && " 🏆 Top Question"}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
