import { memo } from "react";

export type Square = { idx: number; fact: string; owner_camper_id: number; is_free: boolean };

type Props = {
  sq: Square;
  isFound: boolean;
  isSelected: boolean;
  disabled: boolean;
  /** Full name of who this square belongs to, when answers are shown. */
  answer: string | null;
  showAnswers: boolean;
  onSelect: (idx: number) => void;
};

const shortName = (full: string) => {
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0]}.` : first;
};

/** One square on the Fireside Finder card. */
export default memo(function BingoSquare({ sq, isFound, isSelected, disabled, answer, showAnswers, onSelect }: Props) {
  return (
    <button
      disabled={disabled}
      onClick={() => !sq.is_free && onSelect(sq.idx)}
      className={`
        relative aspect-square rounded-lg p-1.5 text-[10px] leading-tight font-medium transition-all
        flex flex-col items-center justify-center text-center overflow-hidden
        ${isFound
          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md"
          : isSelected
            ? "bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 ring-2 ring-amber-300"
            : "bg-card border border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 disabled:hover:border-border disabled:hover:bg-card"
        }
      `}
    >
      {isFound && !showAnswers ? (
        <span className="text-2xl">🔥</span>
      ) : (
        <span className="line-clamp-4 px-0.5">{sq.fact}</span>
      )}
      {showAnswers && !sq.is_free && (
        <span
          className={`absolute bottom-0 inset-x-0 px-1 py-0.5 text-[9px] font-semibold truncate ${
            answer ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"
          }`}
          title={answer ?? "Generic square, not tied to a cAMPer"}
        >
          {answer ? shortName(answer) : "No owner"}
        </span>
      )}
    </button>
  );
});
