import { Icon } from "@/components/ui/icon";
import type { KeyboardEvent } from "react";

export type LogoVoteTeam = {
  id: number;
  name: string;
  logo_url?: string | null;
  color: string | null;
};

type Props = {
  team: LogoVoteTeam;
  voteCount: number;
  votePercent: number;
  isMyTeam: boolean;
  isMyVote: boolean;
  isBestLogo: boolean;
  showResults: boolean;
  /** Medal for the final ranking (1 = gold), or null while voting is still open. */
  place: number | null;
  disabled: boolean;
  onVote: () => void;
  /** Open the logo full size. */
  onZoom: () => void;
};

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** One team in the logo vote: tap to vote, then shows its share of the votes. */
export default function LogoVoteTile({
  team, voteCount, votePercent, isMyTeam, isMyVote, isBestLogo, showResults, place, disabled, onVote, onZoom,
}: Props) {
  const medal = place ? MEDALS[place] : null;
  const vote = () => { if (!disabled) onVote(); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); vote(); }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`Vote for ${team.name}`}
      onClick={vote}
      onKeyDown={onKey}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
        isMyVote
          ? "border-amber-500 bg-amber-100 ring-2 ring-amber-300"
          : isMyTeam
            ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
            : disabled
              ? "border-border bg-white cursor-default"
              : "border-border bg-white hover:border-amber-400 hover:shadow-md cursor-pointer"
      }`}
    >
      {medal && <span className="absolute -top-2 -right-2 text-lg">{medal}</span>}

      {team.logo_url ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onZoom(); }}
          title="View logo full size"
          aria-label={`View ${team.name} logo full size`}
          className="group relative w-24 h-24 rounded-full border-2 bg-white flex items-center justify-center overflow-hidden cursor-zoom-in transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          style={{ borderColor: team.color ?? "#666" }}
        >
          <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/55 py-0.5 text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Icon icon="zoom-in" className="w-2.5 h-2.5" />
            View
          </span>
        </button>
      ) : (
        <div
          className="w-24 h-24 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: team.color ?? "#666" }}
        >
          <span className="text-4xl">🏕️</span>
        </div>
      )}

      <span className="text-sm font-semibold text-foreground text-center leading-tight">{team.name}</span>

      {isBestLogo && (
        <span className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
          🎨 Best Logo
        </span>
      )}

      {showResults && (
        <div className="w-full">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>{voteCount} vote{voteCount !== 1 ? "s" : ""}</span>
            <span>{votePercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${votePercent}%`, backgroundColor: team.color ?? "#666" }}
            />
          </div>
        </div>
      )}

      {isMyTeam && !isMyVote && <span className="text-[10px] text-muted-foreground italic">Your team</span>}
      {isMyVote && (
        <span className="text-[10px] text-amber-700 font-medium flex items-center gap-0.5">
          <Icon icon="circle-check" className="w-3 h-3" />
          Your vote
        </span>
      )}
    </div>
  );
}
