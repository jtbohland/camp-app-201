import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import TimelineEventRow, { type TimelineEvent } from "@/components/ActivityTimeline/TimelineEventRow.js";
import { groupItemNotes, type ItemNote } from "@/lib/managerThreads";

export type FeedEvent = TimelineEvent & { camper_id: number; camper_name: string; camper_first_name: string };
type Filter = "all" | "missed";
const PAGE_SIZE = 20;

type Props = {
  feed: FeedEvent[];
  itemNotes: ItemNote[];
  days: 1 | 3 | 7;
  onDaysChange: (d: 1 | 3 | 7) => void;
  fetching: boolean;
  canReact: boolean;
};

const RANGES: { value: 1 | 3 | 7; label: string }[] = [
  { value: 1, label: "Today" },
  { value: 3, label: "3 days" },
  { value: 7, label: "Week" },
];

/** Manager Portal → what all your hires did recently, in one feed. React right from here. */
export default function ManagerTodayFeed({ feed, itemNotes, days, onDaysChange, fetching, canReact }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const notesByKey = useMemo(() => {
    // Item keys are per-cAMPer, so scope by cAMPer to avoid collisions across hires
    const scoped = itemNotes.map((n) => ({ ...n, target_key: `${n.camper_id}|${n.target_key}` }));
    return groupItemNotes(scoped);
  }, [itemNotes]);

  const rows = useMemo(() => (filter === "missed" ? feed.filter((e) => e.status === "missed") : feed), [feed, filter]);
  const missedCount = useMemo(() => feed.filter((e) => e.status === "missed").length, [feed]);

  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Icon icon="activity" className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold">What your cAMPers are up to</h3>
        {fetching && <span className="text-xs text-muted-foreground">Updating…</span>}
        <div className="ml-auto flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => { onDaysChange(r.value); setVisible(PAGE_SIZE); }}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${days === r.value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => { setFilter(filter === "missed" ? "all" : "missed"); setVisible(PAGE_SIZE); }}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${filter === "missed" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
          >
            Missed only ({missedCount})
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {filter === "missed" ? "Nothing missed in this window." : "No activity in this window yet."}
        </p>
      ) : (
        <div className={`divide-y divide-border ${fetching ? "opacity-70" : ""}`}>
          {rows.slice(0, visible).map((e) => (
            <TimelineEventRow
              key={`${e.camper_id}|${e.key}`}
              event={e}
              who={e.camper_first_name}
              viewer="manager"
              notes={notesByKey.get(`${e.camper_id}|${e.key}`)}
              react={canReact ? { camperId: e.camper_id, camperFirstName: e.camper_first_name } : undefined}
            />
          ))}
        </div>
      )}
      {rows.length > visible && (
        <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Show more ({rows.length - visible} older)
        </Button>
      )}
    </Card>
  );
}
