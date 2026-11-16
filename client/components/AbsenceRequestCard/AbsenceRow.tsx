import { Icon } from "@/components/ui/icon";
import { formatDuration } from "@/lib/absences.js";

export type AbsenceRowData = {
  id: number;
  reason: string | null;
  start_time: string;
  end_time: string;
  minutes: number;
  status: string;
  approval_type: string;
};

type Props = {
  row: AbsenceRowData;
  /** Edit/remove buttons are hidden in counselor preview and once cAMP is closed. */
  canChange: boolean;
  onEdit: (row: AbsenceRowData) => void;
  onRemove: (row: AbsenceRowData) => void;
};

/** One absence in the cAMPer's list, with Edit and Remove while it's still active. */
export default function AbsenceRow({ row, canChange, onEdit, onRemove }: Props) {
  const withdrawn = row.status === "withdrawn";
  return (
    <li className={`flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs ${withdrawn ? "opacity-60" : ""}`}>
      <span className={`truncate text-foreground ${withdrawn ? "line-through" : ""}`}>{row.reason ?? "No reason"}</span>
      <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
        {new Date(row.start_time).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })} · {formatDuration(row.minutes)}
        {withdrawn && (
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Removed</span>
        )}
        {!withdrawn && row.approval_type !== "standard" && (
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${row.approval_type === "counselor_emergency" ? "bg-sky-100 text-sky-800" : "bg-red-100 text-red-700"}`}>
            {row.approval_type === "counselor_emergency" ? "Emergency" : "−1 pt"}
          </span>
        )}
        {!withdrawn && canChange && row.id > 0 && (
          <>
            <button
              onClick={() => onEdit(row)}
              className="ml-1 rounded p-1 hover:bg-background hover:text-foreground"
              title="Edit absence"
              aria-label="Edit absence"
            >
              <Icon icon="pencil" className="h-3 w-3" />
            </button>
            <button
              onClick={() => onRemove(row)}
              className="rounded p-1 hover:bg-red-50 hover:text-red-600"
              title="Remove absence"
              aria-label="Remove absence"
            >
              <Icon icon="trash-2" className="h-3 w-3" />
            </button>
          </>
        )}
      </span>
    </li>
  );
}
