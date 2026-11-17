import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type QuestionState = {
  /** What's in the box right now. */
  draft: string;
  /** The last saved version this person has loaded. */
  saved: string;
  savedAt: string | null;
  savedBy: string | null;
  saving: boolean;
  /** A teammate saved a different answer while this person had unsaved changes. */
  conflict: { answer: string; by: string | null } | null;
};

type Props = {
  questionKey: string;
  label: string;
  state: QuestionState;
  onChange: (key: string, value: string) => void;
  onSave: (key: string, force: boolean) => void;
  onUseTheirs: (key: string) => void;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} hr ago`;
}

/** One workspace question with its own Save button, so teammates can split up the questions. */
function WorkspaceQuestion({ questionKey, label, state, onChange, onSave, onUseTheirs }: Props) {
  const dirty = state.draft !== state.saved;
  const hasText = state.draft.trim().length > 0;

  return (
    <div className="min-w-0 p-4">
      <label htmlFor={`ws-${questionKey}`} className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <textarea
        id={`ws-${questionKey}`}
        className={`box-border block min-h-[80px] w-full max-w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          dirty ? "border-amber-300" : "border-input"
        }`}
        placeholder="Type your team's answer here…"
        value={state.draft}
        onChange={(e) => onChange(questionKey, e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && dirty && !state.saving) onSave(questionKey, false);
        }}
      />

      {state.conflict && (
        <div className="mt-2 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <Icon icon="users" className="h-3.5 w-3.5" />
            {state.conflict.by ?? "A teammate"} just saved a different answer:
          </p>
          <p className="whitespace-pre-wrap rounded border border-amber-200 bg-white/70 p-2 text-amber-950">{state.conflict.answer}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onUseTheirs(questionKey)}>Use their answer</Button>
            <Button size="sm" onClick={() => onSave(questionKey, true)} disabled={state.saving}>Save mine instead</Button>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {dirty
            ? "Not saved yet"
            : state.savedAt
              ? `Saved${state.savedBy ? ` by ${state.savedBy}` : ""} · ${timeAgo(state.savedAt)}`
              : ""}
        </span>
        {!state.conflict && (
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || state.saving || (!hasText && !state.saved)}
            onClick={() => onSave(questionKey, false)}
          >
            {state.saving ? (
              "Saving…"
            ) : dirty ? (
              <><Icon icon="save" className="mr-1 h-3.5 w-3.5" /> Save answer</>
            ) : state.savedAt ? (
              <><Icon icon="check" className="mr-1 h-3.5 w-3.5" /> Saved</>
            ) : (
              "Save answer"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(WorkspaceQuestion);
