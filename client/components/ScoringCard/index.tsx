import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SCORING_CATEGORIES, SCORE_LABELS } from "@/lib/wheelData.js";

type Props = {
  mode: "self" | "coach";
  onSubmit: (scores: Record<string, number>) => void;
  /** Auto-filled completion score (1-3) for self-eval only */
  completionScore?: number;
};

const SCORE_OPTIONS = [1, 2, 3] as const;

const SCORE_COLORS: Record<number, string> = {
  1: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
  2: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
  3: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
};

const SCORE_ACTIVE: Record<number, string> = {
  1: "border-red-500 bg-red-100 text-red-800 ring-2 ring-red-300 scale-105",
  2: "border-amber-500 bg-amber-100 text-amber-800 ring-2 ring-amber-300 scale-105",
  3: "border-green-500 bg-green-100 text-green-800 ring-2 ring-green-300 scale-105",
};

/** Calculate completion score from seconds remaining */
export function calcCompletionScore(timeRemaining: number): number {
  if (timeRemaining >= 30) return 3; // Nailed It
  if (timeRemaining >= 1) return 2;  // Getting There
  return 1;                           // Needs Work (timer ran out)
}

export default function ScoringCard({ mode, onSubmit, completionScore }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({});

  const manualTotal = useMemo(() => Object.values(scores).reduce((s, v) => s + v, 0), [scores]);
  const allRated = SCORING_CATEGORIES.every((c) => scores[c.key] > 0);

  // Both self-eval and coach get completion auto-filled → /15 each
  const hasCompletion = completionScore != null && completionScore > 0;
  const maxScore = hasCompletion ? 15 : 12;
  const displayTotal = hasCompletion ? manualTotal + completionScore : manualTotal;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{mode === "self" ? "⭐" : "👥"}</span>
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {mode === "self" ? "Self-Evaluation" : "Coach Scorecard"}
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        {SCORING_CATEGORIES.map((cat) => {
          const question = mode === "self" ? cat.selfQuestion : cat.coachQuestion;
          const currentScore = scores[cat.key];

          return (
            <div key={cat.key}>
              <div className="flex items-center gap-2 mb-1">
                <span>{cat.icon}</span>
                <span className="text-sm font-semibold text-foreground">{cat.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">{cat.subtext} — {question}</p>
              <div className="flex gap-2">
                {SCORE_OPTIONS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScores((prev) => ({ ...prev, [cat.key]: val }))}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold text-center transition-all ${
                      currentScore === val ? SCORE_ACTIVE[val] : SCORE_COLORS[val]
                    }`}
                  >
                    <div className="text-lg font-bold">{val}</div>
                    <div className="text-[10px] leading-tight">{SCORE_LABELS[val]}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Completion score — locked, auto-filled, self-eval only */}
        {hasCompletion && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span>⚡</span>
              <span className="text-sm font-semibold text-foreground">Completion</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">AUTO</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Based on time remaining when the timer stopped.</p>
            <div className="flex gap-2">
              {SCORE_OPTIONS.map((val) => (
                <div
                  key={val}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold text-center transition-all ${
                    completionScore === val ? SCORE_ACTIVE[val] : "border-border bg-muted/30 text-muted-foreground/50"
                  } ${completionScore === val ? "" : "opacity-40"}`}
                >
                  <div className="text-lg font-bold">{val}</div>
                  <div className="text-[10px] leading-tight">{SCORE_LABELS[val]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="mt-5">
        <Button
          onClick={() => onSubmit(scores)}
          disabled={!allRated}
          className="w-full font-bold"
          size="lg"
        >
          {allRated
            ? `Score: ${displayTotal}/${maxScore} — Submit ${mode === "self" ? "Self-Evaluation" : "Coach Scores"}`
            : `Rate all ${SCORING_CATEGORIES.length} categories to submit`}
        </Button>
      </div>
    </Card>
  );
}
