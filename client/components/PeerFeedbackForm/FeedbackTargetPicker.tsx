import { Icon } from "@/components/ui/icon";

type Option = { id: number; name: string };

type Props = {
  teams: Option[];
  presentations: string[];
  teamId: number | null;
  presentation: string;
  /** Set when the live round picked the presenting team; fields are filled in and locked. */
  autoFilled: boolean;
  onTeamChange: (id: number | null) => void;
  onPresentationChange: (title: string) => void;
  onUnlock: () => void;
};

/** Which team and presentation the review is for. Auto-filled from the live presenting round. */
export default function FeedbackTargetPicker(props: Props) {
  const { teams, presentations, teamId, presentation, autoFilled } = props;
  const teamName = teams.find((t) => t.id === teamId)?.name;

  if (autoFilled && teamName && presentation) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
        <p className="flex items-center gap-2 text-sm text-indigo-900">
          <Icon icon="mic" className="h-4 w-4 text-indigo-500" />
          Reviewing <b>{teamName}</b> · {presentation}
        </p>
        <button onClick={props.onUnlock} className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline">
          Review a different team
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Which team?</label>
        <select
          value={teamId ?? ""}
          onChange={(e) => props.onTeamChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Select team...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Which presentation?</label>
        <select
          value={presentation}
          onChange={(e) => props.onPresentationChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Select presentation...</option>
          {presentations.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
