import { Icon } from "@/components/ui/icon";

type Option = { id: number; name: string; reviewed: boolean };

type Props = {
  /** Teams that have presented in the live round (not your own team). */
  teams: Option[];
  presentation: string;
  teamId: number | null;
  /** True while following the team that's up now; false once the cAMPer picks another team. */
  autoFilled: boolean;
  onTeamChange: (id: number | null) => void;
  onUnlock: () => void;
};

/** Which team the review is for. The presentation is always the live one. */
export default function FeedbackTargetPicker({ teams, presentation, teamId, autoFilled, onTeamChange, onUnlock }: Props) {
  const team = teams.find((t) => t.id === teamId);

  if (autoFilled && team) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
        <p className="flex items-center gap-2 text-sm text-indigo-900">
          <Icon icon="mic" className="h-4 w-4 text-indigo-500" />
          Reviewing <b>{team.name}</b> · {presentation}
        </p>
        {teams.length > 1 && (
          <button onClick={onUnlock} className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline">
            Review a team that already went
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted-foreground">
        Which team? <span className="font-normal">· {presentation}</span>
      </label>
      <select
        value={teamId ?? ""}
        onChange={(e) => onTeamChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">Select a team that has presented...</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id} disabled={t.reviewed}>
            {t.name}{t.reviewed ? " (reviewed ✓)" : ""}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground">Only teams that have already presented show up here.</p>
    </div>
  );
}
