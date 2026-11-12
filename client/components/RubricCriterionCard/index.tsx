import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Criterion } from "@/components/JudgeScoreForm/index.js";

type Props = {
  criterion: Criterion;
  /** The judge's pick for this criterion, if any. */
  selected?: number;
  /** When set, each level tile is a button that scores this criterion. */
  onSelect?: (score: number) => void;
};

type Tone = "red" | "amber" | "green";

const TONES: Record<Tone, { box: string; active: string; dot: string }> = {
  red: { box: "border-red-200 bg-red-50/50", active: "border-red-500 bg-red-100 ring-2 ring-red-400", dot: "bg-red-200 text-red-700" },
  amber: { box: "border-amber-200 bg-amber-50/50", active: "border-amber-500 bg-amber-100 ring-2 ring-amber-400", dot: "bg-amber-200 text-amber-700" },
  green: { box: "border-green-200 bg-green-50/50", active: "border-green-600 bg-green-100 ring-2 ring-green-500", dot: "bg-green-200 text-green-700" },
};

function toneFor(index: number, count: number): Tone {
  if (index === count - 1) return "green";
  if (index === Math.floor(count / 2)) return "amber";
  return "red";
}

/** One rubric criterion with its levels as tiles. Judges tap a tile to score it. */
export default function RubricCriterionCard({ criterion, selected, onSelect }: Props) {
  const clickable = !!onSelect;

  return (
    <Card className="p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{criterion.name}</h4>
        {clickable && (
          <span className={`text-[11px] font-semibold ${selected ? "text-green-700" : "text-muted-foreground"}`}>
            {selected ? `${selected} pt${selected !== 1 ? "s" : ""}` : "Not scored"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {criterion.levels.map((l, i) => {
          const tone = TONES[toneFor(i, criterion.levels.length)];
          const isSelected = selected === l.score;
          const dimmed = clickable && selected !== undefined && !isSelected;
          const body = (
            <>
              <div className="mb-1 flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${tone.dot}`}>{l.score}</span>
                <span className="font-semibold text-foreground">{l.label}</span>
                {isSelected && <Icon icon="circle-check" className="ml-auto h-4 w-4 text-foreground" />}
              </div>
              <p className="leading-relaxed text-muted-foreground">{l.desc}</p>
            </>
          );
          const base = `rounded-lg border p-2.5 text-left text-xs transition-all ${isSelected ? tone.active : tone.box} ${dimmed ? "opacity-60" : ""}`;
          return clickable ? (
            <button
              key={l.score}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(l.score)}
              className={`${base} cursor-pointer hover:opacity-100 hover:shadow-md`}
            >
              {body}
            </button>
          ) : (
            <div key={l.score} className={base}>
              {body}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
