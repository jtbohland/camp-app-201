import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type AnswerState = {
  draft: string;
  saved: string;
  savedAt: string | null;
  saving: boolean;
};

type Props = {
  questionKey: string;
  number: number;
  label: string;
  state: AnswerState;
  onChange: (key: string, value: string) => void;
  onSave: (key: string) => void;
};

/** One "My answers" question with its own Save button. The box always fits inside the tile. */
function AnswerQuestion({ questionKey, number, label, state, onChange, onSave }: Props) {
  const dirty = state.draft !== state.saved;
  const isAnswered = state.saved.trim().length > 0;

  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isAnswered ? "bg-camp-green/20 text-camp-green" : "bg-muted text-muted-foreground"
        }`}
      >
        {isAnswered ? "✓" : number}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <label htmlFor={`ans-${questionKey}`} className="block text-sm text-foreground">
          {label}
        </label>
        <textarea
          id={`ans-${questionKey}`}
          className={`box-border block min-h-[80px] w-full max-w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
            dirty ? "border-amber-300" : "border-input"
          }`}
          placeholder="Type your answer here..."
          value={state.draft}
          onChange={(e) => onChange(questionKey, e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && dirty && !state.saving) onSave(questionKey);
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {dirty ? "Not saved yet" : state.savedAt ? "Saved" : ""}
          </span>
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || state.saving}
            onClick={() => onSave(questionKey)}
          >
            {state.saving ? (
              "Saving…"
            ) : dirty ? (
              <><Icon icon="save" className="mr-1 h-3.5 w-3.5" /> Save answer</>
            ) : isAnswered ? (
              <><Icon icon="check" className="mr-1 h-3.5 w-3.5" /> Saved</>
            ) : (
              "Save answer"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(AnswerQuestion);
