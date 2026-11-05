import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";

type Props = {
  questionId: number;
  answerText: string | null;
  isAnswered: boolean;
  /** The speaker or a counselor can reply and mark answered. */
  canAnswer: boolean;
  onSaved: () => void;
};

/** Speaker reply under a question, with reply / mark-answered controls for the speaker. */
export default function ExecQuestionAnswer({ questionId, answerText, isAnswered, canAnswer, onSaved }: Props) {
  const { run: answer, loading } = useApi("AnswerExecQuestion");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(answerText ?? "");

  const save = useCallback(
    async (text: string | null, answered: boolean) => {
      try {
        await answer({ question_id: questionId, answer_text: text, is_answered: answered });
        setEditing(false);
        onSaved();
      } catch (err) {
        const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
        toast.error(msg);
      }
    },
    [answer, questionId, onSaved]
  );

  return (
    <div className="mt-2">
      {answerText && !editing && (
        <div className="rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Speaker reply</p>
          <p className="whitespace-pre-line text-sm text-foreground">{answerText}</p>
        </div>
      )}

      {canAnswer && editing && (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Type your reply…"
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => save(draft, true)} disabled={loading || !draft.trim()}>
              {loading ? "Saving…" : "Post reply & mark answered"}
            </Button>
          </div>
        </div>
      )}

      {canAnswer && !editing && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setDraft(answerText ?? "");
              setEditing(true);
            }}
            disabled={loading}
          >
            <Icon icon="reply" className="mr-1 h-3.5 w-3.5" />
            {answerText ? "Edit reply" : "Reply"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={`h-7 text-xs ${isAnswered ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
            onClick={() => save(null, !isAnswered)}
            disabled={loading}
          >
            <Icon icon={isAnswered ? "circle-check" : "circle"} className="mr-1 h-3.5 w-3.5" />
            {isAnswered ? "Answered" : "Mark answered"}
          </Button>
        </div>
      )}
    </div>
  );
}
