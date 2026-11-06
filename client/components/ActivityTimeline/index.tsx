import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { groupItemNotes } from "@/lib/managerThreads";
import TimelineEventRow from "./TimelineEventRow.js";

type Filter = "all" | "done" | "missed";
const PAGE_SIZE = 25;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "done", label: "Done" },
  { key: "missed", label: "Missed" },
];

type Props = {
  camperId: number;
  viewer?: "manager" | "counselor";
  /** Managers who can still write get a react/comment button on every item. */
  canReact?: boolean;
  camperFirstName?: string;
};

/** Everything a cAMPer did, and didn't do, newest first. Used on counselor and manager report cards. */
export default function ActivityTimeline({ camperId, viewer = "counselor", canReact = false, camperFirstName = "" }: Props) {
  const { data, loading, fetching, isError, refetch } = useApiData("GetCamperActivity", { camper_id: camperId });
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const notesByKey = useMemo(() => groupItemNotes(data?.item_notes), [data]);
  const react = canReact && viewer === "manager" ? { camperId, camperFirstName } : undefined;

  const filtered = useMemo(() => {
    const events = data?.events ?? [];
    if (filter === "done") return events.filter((e) => e.status === "done" || e.status === "late");
    if (filter === "missed") return events.filter((e) => e.status === "missed");
    return events;
  }, [data, filter]);

  // Group the visible events by day for headings
  const groups = useMemo(() => {
    const out: { day: string; events: typeof filtered }[] = [];
    for (const e of filtered.slice(0, visible)) {
      const day = new Date(e.at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      const last = out[out.length - 1];
      if (last && last.day === day) last.events.push(e);
      else out.push({ day, events: [e] });
    }
    return out;
  }, [filtered, visible]);

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  const summary = data?.summary ?? { done: 0, missed: 0, excused: 0 };

  return (
    <Card className="p-5 print:break-inside-avoid">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Icon icon="history" className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-foreground">Activity timeline</h3>
        <span className="text-xs text-muted-foreground">
          {summary.done} done · <span className={summary.missed > 0 ? "font-semibold text-red-600" : ""}>{summary.missed} missed</span>
          {summary.excused > 0 && ` · ${summary.excused} excused`}
        </span>
        {fetching && <span className="text-xs text-muted-foreground">Updating…</span>}
        <div className="ml-auto flex gap-1 print:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setVisible(PAGE_SIZE); }}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                filter === f.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {react && (
        <p className="mb-2 text-[11px] text-muted-foreground print:hidden">
          Tap <Icon icon="smile-plus" className="inline h-3 w-3" /> on any item to react or leave a note about it.
        </p>
      )}

      {isError ? (
        <div className="py-4 text-center">
          <p className="text-xs text-destructive">Couldn't load activity.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {filter === "missed" ? "Nothing missed. Nice!" : "No activity yet"}
        </p>
      ) : (
        <div className={fetching ? "opacity-70" : ""}>
          {groups.map((g) => (
            <div key={g.day} className="mb-2">
              <p className="sticky top-0 bg-card py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g.day}</p>
              <div className="divide-y divide-border">
                {g.events.map((e) => (
                  <TimelineEventRow key={e.key} event={e} notes={notesByKey.get(e.key)} viewer={viewer} react={react} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length > visible && (
            <Button variant="ghost" size="sm" className="w-full print:hidden" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show more ({filtered.length - visible} older)
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
