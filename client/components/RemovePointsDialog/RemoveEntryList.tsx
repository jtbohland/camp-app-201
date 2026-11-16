import type { RemovableEntry } from "./index.js";

type Props = { entries: RemovableEntry[]; showNames: boolean };

/** Scrollable summary of the entries about to be removed. */
export default function RemoveEntryList({ entries, showNames }: Props) {
  return (
    <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-md border border-border">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
          <div className="min-w-0">
            <p className="truncate text-xs text-foreground" title={e.reason ?? undefined}>{e.reason || "Points"}</p>
            {showNames && e.camperName && <p className="truncate text-[10px] text-muted-foreground">{e.camperName}</p>}
          </div>
          <span className={`shrink-0 text-xs font-bold ${e.points < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {e.points > 0 ? `+${e.points}` : e.points}
          </span>
        </div>
      ))}
    </div>
  );
}
