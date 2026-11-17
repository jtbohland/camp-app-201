import { memo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import ExecQuestionAnswer from "@/components/ExecQuestionAnswer/index.js";

export type ExecQuestion = {
  id: number;
  submitted_by: number;
  submitter_name: string | null;
  submitter_team_id: number | null;
  question_text: string;
  vote_count: number;
  is_asked: boolean;
  user_vote: number | null;
  answer_text: string | null;
};

type Props = {
  q: ExecQuestion;
  isTop: boolean;
  mode: "camper" | "speaker" | "counselor";
  isOwn: boolean;
  canVote: boolean;
  canEdit: boolean;
  canAnswer: boolean;
  onVote: (q: ExecQuestion, vote: 1 | -1) => void;
  onEdit: (q: ExecQuestion, text: string) => Promise<boolean>;
  onAnswered: () => void;
};

function ExecQuestionCard({ q, isTop, mode, isOwn, canVote, canEdit, canAnswer, onVote, onEdit, onAnswered }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(q.question_text);
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(() => { setDraft(q.question_text); setEditing(true); }, [q.question_text]);
  const save = useCallback(async () => {
    setSaving(true);
    const ok = await onEdit(q, draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
  }, [onEdit, q, draft]);

  const up = q.user_vote === 1;
  const down = q.user_vote === -1;

  return (
    <Card className={`p-3 flex gap-3 ${isTop ? "border-amber-400 bg-amber-50/50" : ""} ${q.is_asked ? "border-green-400 bg-green-50/50" : ""}`}>
      <div className="flex flex-col items-center gap-0.5">
        {mode === "speaker" ? (
          <>
            <Icon icon="thumbs-up" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={`text-sm font-bold ${q.vote_count > 0 ? "text-camp-green" : "text-muted-foreground"}`}>{q.vote_count}</span>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onVote(q, 1)}
              disabled={!canVote}
              aria-label={up ? "Remove upvote" : "Upvote"}
              title={canVote ? (up ? "Click again to remove your upvote" : "Upvote") : undefined}
              className={`rounded p-1 transition-colors ${up ? "bg-camp-green/15 text-camp-green" : "text-muted-foreground"} ${canVote ? "hover:text-camp-green" : "opacity-40"}`}
            >
              <Icon icon="chevron-up" className="w-5 h-5" />
            </button>
            <span className={`text-sm font-bold ${q.vote_count > 0 ? "text-camp-green" : q.vote_count < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {q.vote_count}
            </span>
            <button
              type="button"
              onClick={() => onVote(q, -1)}
              disabled={!canVote}
              aria-label={down ? "Remove downvote" : "Downvote"}
              className={`rounded p-1 transition-colors ${down ? "bg-red-50 text-red-500" : "text-muted-foreground"} ${canVote ? "hover:text-red-500" : "opacity-40"}`}
            >
              <Icon icon="chevron-down" className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} className="text-sm" autoFocus />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saving || draft.trim().length < 5 || draft.trim() === q.question_text}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm break-words">{q.question_text}</p>
            {canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Edit your question"
                aria-label="Edit your question"
              >
                <Icon icon="pencil" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {q.submitter_name} {isOwn && mode === "camper" && "(you)"} {q.is_asked && "✅ Answered"}
          {isTop && " 🏆 Top Question"}
        </p>
        <ExecQuestionAnswer
          questionId={q.id}
          answerText={q.answer_text ?? null}
          isAnswered={!!q.is_asked}
          canAnswer={canAnswer}
          onSaved={onAnswered}
        />
      </div>
    </Card>
  );
}

export default memo(ExecQuestionCard);
