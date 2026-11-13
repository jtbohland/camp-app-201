import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import PhotoDropZone from "@/components/PhotoDropZone/index.js";

export type ChampionTeam = {
  id: number;
  team_name: string;
  cohort_number: number;
  date_label: string;
  trophy_photo_url: string | null;
};

type Props = {
  team: ChampionTeam;
  busy: boolean;
  onSave: (teamId: number, photo: string | null) => void;
};

/** One champion team: trophy photo thumbnail, drop to add/replace, remove. */
export default function TrophyPhotoRow({ team, busy, onSave }: Props) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
      <PhotoDropZone onPhoto={(d) => { setError(null); onSave(team.id, d); }} onError={setError} disabled={busy} maxSize={1200}
        className="shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {({ dragging }) =>
          team.trophy_photo_url ? (
            <img src={team.trophy_photo_url} alt={`${team.team_name} trophy photo`}
              className={`h-16 w-24 rounded-md object-cover ring-2 ${dragging ? "ring-amber-400" : "ring-transparent"}`} />
          ) : (
            <div className={`flex h-16 w-24 flex-col items-center justify-center rounded-md border-2 border-dashed text-[10px] ${
              dragging ? "border-amber-400 bg-amber-50" : "border-border bg-muted/40 text-muted-foreground"}`}>
              <Icon icon="trophy" className="h-4 w-4" />
              Add photo
            </div>
          )
        }
      </PhotoDropZone>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">🏆 {team.team_name}</p>
        <p className="text-xs text-muted-foreground">Cohort {team.cohort_number} · {team.date_label}</p>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
      {team.trophy_photo_url && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600 hover:text-red-700" disabled={busy}
          onClick={() => onSave(team.id, null)}>
          <Icon icon="trash-2" className="h-3.5 w-3.5" /> Remove
        </Button>
      )}
    </div>
  );
}
