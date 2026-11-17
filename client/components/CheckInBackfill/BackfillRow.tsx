import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type BackfillPerson = {
  camper_id: number;
  name: string;
  team_name: string | null;
  status: "missing" | "late";
};

type Props = {
  person: BackfillPerson;
  busy: boolean;
  onBackfill: (person: BackfillPerson) => void;
};

/** One cAMPer who missed a check-in (or was charged late), with a one-click back-fill. */
function BackfillRow({ person, busy, onBackfill }: Props) {
  const missing = person.status === "missing";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {person.team_name ?? "No team"} ·{" "}
          <span className={missing ? "text-red-600" : "text-amber-700"}>{missing ? "Missed" : "Late (-2)"}</span>
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onBackfill(person)}>
        {busy ? <Icon icon="loader-2" className="w-3.5 h-3.5 animate-spin" /> : <Icon icon="user-check" className="w-3.5 h-3.5" />}
        {missing ? "Back-fill" : "Remove penalty"}
      </Button>
    </div>
  );
}

export default memo(BackfillRow);
