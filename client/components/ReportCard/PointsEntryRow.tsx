import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import EntryStatus from "@/components/RemovePointsDialog/EntryStatus.js";
import { fmtDate } from "./ReportSection.js";

export type PointsLogRow = {
  id: number;
  points: number;
  reason: string | null;
  created_at: string;
  category: string | null;
  reversed: boolean;
  is_reversal: boolean;
};

type Props = {
  r: PointsLogRow;
  canRemove: boolean;
  selectable: boolean;
  selected: boolean;
  onToggle: (r: PointsLogRow) => void;
  onRemove: (r: PointsLogRow) => void;
};

/** One line in the report card's Points list, with an optional checkbox for bulk removal. */
function PointsEntryRow({ r, canRemove, selectable, selected, onToggle, onRemove }: Props) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 ${r.reversed ? "opacity-60" : ""} ${
        selected ? "-mx-1 rounded bg-muted/60 px-1" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {canRemove && (
          <span className="flex w-4 shrink-0 justify-center print:hidden">
            {selectable && (
              <Checkbox checked={selected} onCheckedChange={() => onToggle(r)} aria-label={`Select ${r.reason || "entry"}`} />
            )}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs text-foreground" title={r.reason ?? undefined}>{r.reason || "Points"}</p>
          <p className="text-[10px] text-muted-foreground">{fmtDate(r.created_at, true)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {(canRemove || r.reversed || r.is_reversal) && (
          <EntryStatus
            points={r.points}
            category={r.category}
            reversed={r.reversed}
            isReversal={r.is_reversal}
            onRemove={canRemove ? () => onRemove(r) : undefined}
          />
        )}
        <span className={`text-xs font-bold ${r.reversed ? "line-through" : ""} ${r.points < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {r.points > 0 ? `+${r.points}` : r.points}
        </span>
      </div>
    </div>
  );
}

export default memo(PointsEntryRow);
