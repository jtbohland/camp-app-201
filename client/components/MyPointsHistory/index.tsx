import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";
import PointsHistoryRow, { type PointsHistoryEntry } from "./PointsHistoryRow";

type Filter = "all" | "earned" | "lost";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "earned", label: "Earned" },
  { key: "lost", label: "Lost" },
];
const PAGE_SIZE = 20;

function Stat({ value, label, tone }: { value: string | number; label: string; tone: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** The cAMPer's own point log: every entry, exactly as recorded, newest first. */
export default function MyPointsHistory() {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { data, loading, fetching, isError, error, refetch } = useApiData("GetMyPointsHistory", {}, { refetchOnWindowFocus: true });

  const entries: PointsHistoryEntry[] = data?.entries ?? [];
  const shown = useMemo(() => {
    if (filter === "earned") return entries.filter((e) => e.points > 0);
    if (filter === "lost") return entries.filter((e) => e.points < 0);
    return entries;
  }, [entries, filter]);

  if (loading) {
    return (
      <Card className="p-6 space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-red-600">Couldn&apos;t load your points: {String((error as { message?: unknown })?.message ?? error)}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon icon="zap" className="h-5 w-5 text-amber-500" />
          My Points
        </h2>
        <span className="text-xs text-muted-foreground">
          {fetching ? "Updating…" : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat value={data?.total ?? 0} label="Total" tone="text-amber-600" />
        <Stat value={`+${data?.earned ?? 0}`} label="Earned" tone="text-emerald-600" />
        <Stat value={(data?.lost ?? 0) > 0 ? `−${data?.lost}` : "0"} label="Lost" tone={(data?.lost ?? 0) > 0 ? "text-red-600" : "text-muted-foreground"} />
      </div>

      <div className="mb-2 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setVisible(PAGE_SIZE); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {filter === "lost" ? "No points lost. Nice!" : "No points yet. They'll show up here as you earn them."}
        </p>
      ) : (
        <div className={`divide-y divide-border ${fetching ? "opacity-70" : ""}`}>
          {shown.slice(0, visible).map((e) => <PointsHistoryRow key={e.id} e={e} />)}
        </div>
      )}

      {shown.length > visible && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Show more ({shown.length - visible} left)
        </Button>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Team points (like survey race bonuses) count toward your team&apos;s total, not your own. Spot something wrong? Ask a counselor.
      </p>
    </Card>
  );
}
