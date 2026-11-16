import { memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EntryStatus from "@/components/RemovePointsDialog/EntryStatus.js";

export type PointLogEntry = {
  id: number;
  camper_id: number;
  camper_name: string;
  points: number;
  reason: string;
  awarded_by: string | null;
  created_at: string;
  running_total: number;
  category: string | null;
  reversed: boolean;
  is_reversal: boolean;
};

const PT = "America/Los_Angeles";
export const ptDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { timeZone: PT, month: "short", day: "numeric", year: "numeric" });
export const ptTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: PT, hour: "numeric", minute: "2-digit", second: "2-digit" });

/** Who gave the points, in plain words. */
export function awardedByLabel(by: string | null): string {
  if (!by || by === "system") return "Automatic";
  if (by === "points_audit") return "Points audit (missed award)";
  return by;
}

type RowProps = {
  e: PointLogEntry;
  onCamperClick?: (id: number) => void;
  onRemove?: (e: PointLogEntry) => void;
};

const Row = memo(function Row({ e, onCamperClick, onRemove }: RowProps) {
  return (
    <TableRow className={e.reversed ? "opacity-60" : ""}>
      <TableCell className="font-medium">
        {onCamperClick ? (
          <button className="hover:underline text-left" onClick={() => onCamperClick(e.camper_id)}>
            {e.camper_name || `cAMPer #${e.camper_id}`}
          </button>
        ) : (
          e.camper_name
        )}
      </TableCell>
      <TableCell
        className={`text-right font-mono font-semibold ${e.reversed ? "line-through" : ""} ${
          e.points > 0 ? "text-camp-green" : e.points < 0 ? "text-red-600" : "text-muted-foreground"
        }`}
      >
        {e.points > 0 ? `+${e.points}` : e.points}
      </TableCell>
      <TableCell className="max-w-[340px]">
        <p className="truncate" title={e.reason}>{e.reason}</p>
        <p className="text-[11px] text-muted-foreground truncate">{awardedByLabel(e.awarded_by)}</p>
      </TableCell>
      <TableCell className="whitespace-nowrap">{ptDate(e.created_at)}</TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{ptTime(e.created_at)}</TableCell>
      <TableCell className="text-right font-mono">{e.running_total}</TableCell>
      {onRemove && (
        <TableCell className="text-right">
          <EntryStatus
            points={e.points}
            category={e.category}
            reversed={e.reversed}
            isReversal={e.is_reversal}
            onRemove={() => onRemove(e)}
          />
        </TableCell>
      )}
    </TableRow>
  );
});

type Props = {
  entries: PointLogEntry[];
  onCamperClick?: (id: number) => void;
  /** When set, each entry gets a Remove / Undo button. */
  onRemove?: (e: PointLogEntry) => void;
};

export default function PointLogTable({ entries, onCamperClick, onRemove }: Props) {
  const cols = onRemove ? 7 : 6;
  return (
    <div className="rounded-lg border border-border bg-background overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>cAMPer</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Date earned</TableHead>
            <TableHead>Time earned (PT)</TableHead>
            <TableHead className="text-right">Total points</TableHead>
            {onRemove && <TableHead className="w-24" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={cols} className="text-center text-sm text-muted-foreground py-10">
                No point entries match these filters.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((e) => <Row key={e.id} e={e} onCamperClick={onCamperClick} onRemove={onRemove} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}
