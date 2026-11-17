import { memo } from "react";

export type PointsHistoryEntry = {
  id: number;
  points: number;
  reason: string;
  created_at: string;
  running_total: number;
  team_only: boolean;
  reversed: boolean;
  is_reversal: boolean;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** One point-log entry: what it was for, when, the points, and the total right after it. */
function PointsHistoryRow({ e }: { e: PointsHistoryEntry }) {
  const negative = e.points < 0;
  return (
    <div className={`flex items-center justify-between gap-3 py-2.5 ${e.reversed ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm text-foreground break-words">{e.reason || "Points"}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{fmt(e.created_at)}</span>
          {e.team_only && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Team points</span>}
          {e.reversed && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">Removed by a counselor</span>}
          {e.is_reversal && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">Correction</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${e.reversed ? "line-through" : ""} ${negative ? "text-red-600" : "text-emerald-600"}`}>
          {e.points > 0 ? `+${e.points}` : e.points}
        </p>
        {!e.team_only && <p className="text-[10px] text-muted-foreground">Total {e.running_total}</p>}
      </div>
    </div>
  );
}

export default memo(PointsHistoryRow);
