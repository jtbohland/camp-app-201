import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { executeApi } from "@/lib/executeApi";
import PointLogFilters, { EMPTY_POINT_LOG_FILTERS, type PointLogFilterValues } from "@/components/PointLogFilters/index.js";
import PointLogTable, { awardedByLabel, ptDate, ptTime, type PointLogEntry } from "@/components/PointLogTable/index.js";
import PointsAuditPanel from "@/components/PointsAuditPanel/index.js";

const PAGE_SIZE = 50;

/** Debounce filter changes (date/time inputs fire on every keystroke). */
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function toInputs(f: PointLogFilterValues) {
  return {
    camper_id: f.camperId ? Number(f.camperId) : null,
    date_from: f.dateFrom || null,
    date_to: f.dateTo || null,
    time_from: f.timeFrom || null,
    time_to: f.timeTo || null,
    points: f.points ? Number(f.points) : null,
  };
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Hub › Point Log: every point a cAMPer has earned or lost, for history and audits. */
export default function AdminPointLog({ onCamperClick }: { onCamperClick?: (id: number) => void }) {
  const [filters, setFilters] = useState<PointLogFilterValues>(EMPTY_POINT_LOG_FILTERS);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const debounced = useDebounced(filters);

  useEffect(() => setPage(0), [debounced]);

  const inputs = useMemo(() => ({ ...toInputs(debounced), page, page_size: PAGE_SIZE }), [debounced, page]);
  const { data, loading, fetching, isError, error, refetch } = useApiData("GetPointLog", inputs, {
    placeholderData: (prev: any) => prev,
  } as any);

  const total = data?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const rows: PointLogEntry[] = [];
      for (let p = 0; p < 200; p++) {
        const res = await executeApi("GetPointLog", { ...toInputs(debounced), page: p, page_size: 5000 });
        rows.push(...(res.entries as PointLogEntry[]));
        if (rows.length >= res.total_count || res.entries.length === 0) break;
      }
      const header = ["cAMPer", "Points", "Reason", "Awarded by", "Date (PT)", "Time (PT)", "Total points"];
      const lines = rows.map((e) =>
        [e.camper_name, e.points, e.reason, awardedByLabel(e.awarded_by), ptDate(e.created_at), ptTime(e.created_at), e.running_total]
          .map(csvCell)
          .join(",")
      );
      const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `point-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
      toast.error("Couldn't export the point log: " + message);
    } finally {
      setExporting(false);
    }
  }, [debounced]);

  return (
    <div className="space-y-4">
      <PointsAuditPanel onCamperClick={onCamperClick} />
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Icon icon="scroll-text" className="w-4 h-4 text-camp-green" />
              Point Log Sheet
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Every time a cAMPer earns or loses points, newest first. "Total points" is the cAMPer's running total right
              after that entry. Times are Pacific.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={fetching}>
              <Icon icon="refresh-cw" className={`w-3.5 h-3.5 mr-1.5 ${fetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || total === 0}>
              <Icon icon={exporting ? "loader-2" : "download"} className={`w-3.5 h-3.5 mr-1.5 ${exporting ? "animate-spin" : ""}`} />
              Export CSV
            </Button>
          </div>
        </div>
        <PointLogFilters
          value={filters}
          onChange={setFilters}
          campers={data?.campers ?? []}
          pointValues={data?.point_values ?? []}
        />
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError && !data ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-red-600">
            Couldn't load the point log. {error && typeof error === "object" && "message" in error ? String((error as any).message) : ""}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {total.toLocaleString()} {total === 1 ? "entry" : "entries"} · net{" "}
              <span className="font-semibold text-foreground">
                {(data?.points_sum ?? 0) > 0 ? "+" : ""}
                {data?.points_sum ?? 0} pts
              </span>
            </span>
            {fetching && <span>Updating…</span>}
          </div>
          <div className={fetching ? "opacity-70" : ""}>
            <PointLogTable entries={(data?.entries ?? []) as PointLogEntry[]} onCamperClick={onCamperClick} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
