import { Icon } from "@/components/ui/icon";
import { canCreate, teamSizeLabel } from "./teamSizing";

type TeamCountButtonProps = {
  teams: number;
  headcount: number;
  recommended: boolean;
  disabled: boolean;
  onClick: (teams: number) => void;
};

export default function TeamCountButton({ teams, headcount, recommended, disabled, onClick }: TeamCountButtonProps) {
  const allowed = canCreate(headcount, teams);
  return (
    <button
      type="button"
      disabled={disabled || !allowed}
      onClick={() => onClick(teams)}
      className={`relative flex flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors min-w-[150px] disabled:cursor-not-allowed disabled:opacity-40 ${
        recommended
          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
          : "border-border bg-muted/50 text-foreground hover:bg-secondary"
      }`}
    >
      {recommended && allowed && (
        <span className="absolute -top-2 right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">
          Best fit
        </span>
      )}
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon icon="shuffle" className="h-4 w-4" />
        Create {teams} teams
      </span>
      <span className={`text-xs ${recommended ? "text-white/85" : "text-muted-foreground"}`}>
        {allowed ? `${teamSizeLabel(headcount, teams)} per team` : `Needs ${teams * 2}+ cAMPers`}
      </span>
    </button>
  );
}
