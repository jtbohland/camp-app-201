import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Team = { id: number; name: string };

type Props = {
  teams: Team[];
  selectedTeamId: number | null;
  /** Teams this judge has already scored (shown with a check). */
  scoredTeamIds: Set<number>;
  onSelect: (teamId: number) => void;
};

/** Team buttons at the top of the judge's scoring view. A check means you've scored that team. */
export default function JudgeTeamPicker({ teams, selectedTeamId, scoredTeamIds, onSelect }: Props) {
  if (teams.length === 0) {
    return <p className="text-xs text-muted-foreground">No teams yet. Generate teams in the Counselor Hub first.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-medium text-muted-foreground">Scoring:</span>
      {teams.map((t) => (
        <Button
          key={t.id}
          variant={selectedTeamId === t.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(t.id)}
          className="text-xs"
        >
          {t.name}
          {scoredTeamIds.has(t.id) && <Icon icon="check" className="ml-1 h-3 w-3 text-green-500" />}
        </Button>
      ))}
    </div>
  );
}
