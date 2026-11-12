import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import CohortMemberCard from "@/components/CohortMemberCard/index.js";
import ConfirmRemoveCamperDialog from "@/components/ConfirmRemoveCamperDialog/index.js";
import RemovedCampersList from "@/components/RemovedCampersList/index.js";
import LastSeenPill from "@/components/LastSeenPill/index.js";
import { errorMessage } from "@/lib/cohortRefresh";
import { refreshRosterViews } from "@/lib/camperRemoval";
import { COHORT_SORTS, sortCohortMembers, type CohortMember, type CohortSort } from "@/lib/cohortMember.js";

interface Props {
  cohortId: number | null;
  onCamperClick: (camperId: number) => void;
  /** False while viewing a past cohort (read-only). */
  canEdit: boolean;
}

type CampersData = { campers: Array<{ id: number; points: number }>; total_points: number; total_campers: number };

const PAGE_SIZE = 24;

/** Counselor Hub → cAMPers: the same tiles as the Cohort page; click one for the report card. */
export default function AdminLearnerGrid({ cohortId, onCamperClick, canEdit }: Props) {
  const inputs = useMemo(() => ({ cohort_id: cohortId }), [cohortId]);
  const { data, loading, fetching } = useApiData("GetAdminCampers", inputs);
  const { run: removeCamper } = useApi("RemoveCamper");
  // Manager message counts per cAMPer (tile badges)
  const { data: threadBadges } = useApiData("GetManagerThreadBadges", {}, { refetchInterval: 60_000 });
  const messagesByCamper = useMemo(
    () => new Map((threadBadges?.by_camper ?? []).map((b) => [b.camper_id, b])),
    [threadBadges],
  );
  const [pendingRemove, setPendingRemove] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CohortSort | "points">("points");
  const [page, setPage] = useState(0);

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemove) return;
    const { id, name } = pendingRemove;
    setPendingRemove(null);

    // Take the card off the grid right away; put it back if the request fails.
    const cacheKey = queryClient.buildCacheKey("GetAdminCampers", inputs);
    const previous = queryClient.getQueryData<CampersData>(cacheKey);
    if (previous) {
      const removed = previous.campers.find((c) => c.id === id);
      queryClient.setQueryData<CampersData>(cacheKey, {
        ...previous,
        campers: previous.campers.filter((c) => c.id !== id),
        total_campers: previous.total_campers - 1,
        total_points: previous.total_points - (removed?.points ?? 0),
      });
    }
    try {
      await removeCamper({ camper_id: id });
      toast.success(`${name} was removed. Their profile and points are saved.`);
      await refreshRosterViews();
    } catch (error) {
      if (previous) queryClient.setQueryData<CampersData>(cacheKey, previous);
      toast.error("Couldn't remove: " + errorMessage(error));
    }
  }, [pendingRemove, removeCamper, inputs]);

  const campers = useMemo(() => data?.campers ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? campers.filter((c) =>
          `${c.first_name} ${c.last_name} ${c.email} ${c.team_name ?? ""} ${c.manager ?? ""}`.toLowerCase().includes(q)
        )
      : campers;
    if (sort === "points") return [...list].sort((a, b) => b.points - a.points);
    return sortCohortMembers(list as unknown as CohortMember[], sort) as unknown as typeof list;
  }, [campers, search, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard value={data?.total_campers ?? 0} label="Total cAMPers" />
        <StatCard value={data?.total_points ?? 0} label="Total Points Awarded" />
        <StatCard value={campers.filter((c) => c.profile_completed).length} label="Profiles Complete" />
        <StatCard value={campers.length > 0 ? Math.round((data?.total_points ?? 0) / campers.length) : 0} label="Avg Points / cAMPer" />
      </div>

      {/* Search + sort */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon icon="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name, team or manager…"
            className="pl-9"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as CohortSort | "points");
            setPage(0);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Sort cAMPers"
        >
          <option value="points">Most points</option>
          {COHORT_SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          <Icon icon="mouse-pointer-click" className="mr-1 inline h-3 w-3" />
          Click any cAMPer for their report card
        </p>
        {fetching && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>

      {/* Grid: same tile as the Cohort page */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${fetching ? "opacity-70" : ""}`}>
        {pageRows.map((camper) => (
          <div key={camper.id} className="relative">
            <CohortMemberCard
              member={camper as unknown as CohortMember}
              onOpen={() => onCamperClick(camper.id)}
              extraPills={
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <Icon icon="star" className="h-3 w-3" />
                    {camper.points} pts
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      camper.absences_used >= 3 ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon icon="calendar-x" className="h-3 w-3" />
                    {camper.absences_used}/3 absences
                  </span>
                  <LastSeenPill lastSeenAt={camper.last_seen_at} />
                  {(() => {
                    const m = messagesByCamper.get(camper.id);
                    if (!m || m.total === 0) return null;
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          m.unread > 0 ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"
                        }`}
                        title={m.unread > 0 ? `${m.unread} new manager message${m.unread !== 1 ? "s" : ""}` : "Manager messages"}
                      >
                        <Icon icon="message-circle" className="h-3 w-3" />
                        {m.unread > 0 ? `${m.unread} new` : m.total}
                      </span>
                    );
                  })()}
                  {!camper.profile_completed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      <Icon icon="circle-alert" className="h-3 w-3" />
                      Profile incomplete
                    </span>
                  )}
                </>
              }
            />
            {canEdit && (
              <button
                type="button"
                title="Remove from cAMP"
                aria-label={`Remove ${camper.first_name} ${camper.last_name} from cAMP`}
                className="absolute right-2 top-2 rounded-md bg-background/80 p-1 text-muted-foreground backdrop-blur transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingRemove({ id: camper.id, name: `${camper.first_name} ${camper.last_name}` });
                }}
              >
                <Icon icon="user-x" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages} ({filtered.length} cAMPers)</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Previous</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Icon icon="users" className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">{search ? "No cAMPers match your search" : "No cAMPers in this cohort yet"}</p>
        </div>
      )}

      <RemovedCampersList canEdit={canEdit} />

      <ConfirmRemoveCamperDialog
        name={pendingRemove?.name ?? null}
        onCancel={() => setPendingRemove(null)}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Card className="p-4 bg-muted/50 border-border">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
