import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CohortMemberCard from "@/components/CohortMemberCard/index.js";
import CohortMemberDialog from "@/components/CohortMemberDialog/index.js";
import CohortHeroStats from "@/components/CohortHeroStats/index.js";
import { ROLE_GROUP_ORDER, getRoleGroup, mapToStandardRole, type RoleGroup } from "@/lib/roles.js";
import { COHORT_SORTS, sortCohortMembers, isCounselorMember, type CohortMember, type CohortSort } from "@/lib/cohortMember.js";

export default function CohortTab() {
  const { data, loading, fetching } = useApiData("GetCohort", {});
  // Name typed when the cohort was created (or the past cohort a counselor is viewing).
  const { data: viewData } = useApiData("GetViewCohort", {}, { staleTime: 30_000 });
  const cohortName = viewData?.cohort_name ?? null;
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleGroup | null>(null);
  const [sort, setSort] = useState<CohortSort>("name");
  const [openMember, setOpenMember] = useState<CohortMember | null>(null);
  const closeMember = useCallback(() => setOpenMember(null), []);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(e.target.value), 300);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const allMembers = (data?.members ?? []) as CohortMember[];
  const allCampers = useMemo(() => allMembers.filter((m) => !isCounselorMember(m)), [allMembers]);

  const roleCounts = useMemo(() => {
    const map = new Map<RoleGroup, number>();
    for (const m of allCampers) {
      const g = getRoleGroup(m.role);
      if (g) map.set(g, (map.get(g) ?? 0) + 1);
    }
    return ROLE_GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [allCampers]);

  const members = useMemo(() => {
    let list = allMembers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        `${m.first_name} ${m.last_name} ${mapToStandardRole(m.role) ?? m.role ?? ""} ${m.region ?? ""} ${m.country ?? ""} ${m.team_name ?? ""} ${m.manager ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    }
    return sortCohortMembers(list, sort);
  }, [allMembers, search, sort]);

  const counselors = useMemo(() => (roleFilter ? [] : members.filter(isCounselorMember)), [members, roleFilter]);
  const campers = useMemo(
    () => members.filter((m) => !isCounselorMember(m) && (!roleFilter || getRoleGroup(m.role) === roleFilter)),
    [members, roleFilter]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="h-10 w-full max-w-sm bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const shownCount = counselors.length + campers.length;

  return (
    <div className="flex flex-col gap-6 w-full">
      <CohortHeroStats
        cohortName={cohortName}
        members={allMembers}
        roleCounts={roleCounts}
        activeRole={roleFilter}
        onRoleClick={(g) => setRoleFilter((cur) => (cur === g ? null : g))}
      />

      {/* Search + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {roleFilter ? `Showing ${campers.length} ${roleFilter} cAMPer${campers.length === 1 ? "" : "s"}` : `${shownCount} members in this cohort`}
          </p>
          {roleFilter && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRoleFilter(null)}>
              <Icon icon="users" className="mr-1 h-3.5 w-3.5" />
              View all cAMPers
            </Button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as CohortSort)}>
            <SelectTrigger className="h-9 w-48 text-sm" aria-label="Sort cAMPers">
              <Icon icon="arrow-up-down" className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COHORT_SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full max-w-xs">
            <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={localSearch}
              onChange={handleSearchChange}
              placeholder="Search name, role, country, manager..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {fetching && !loading && (
        <div className="text-xs text-muted-foreground">Updating...</div>
      )}

      <div className={fetching ? "opacity-70" : ""}>
        {counselors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Icon icon="shield" className="w-4 h-4" />
              Counselors ({counselors.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counselors.map((m) => (
                <CohortMemberCard key={m.id} member={m} onOpen={setOpenMember} />
              ))}
            </div>
          </div>
        )}

        {campers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Icon icon="tent" className="w-4 h-4" />
              {roleFilter ? `${roleFilter} cAMPers` : "cAMPers"} ({campers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campers.map((m) => (
                <CohortMemberCard key={m.id} member={m} onOpen={setOpenMember} />
              ))}
            </div>
          </div>
        )}

        {shownCount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Icon icon={search.trim() || roleFilter ? "search" : "tent"} className="w-12 h-12 opacity-30 mb-3" />
            <p className="text-sm">
              {search.trim() || roleFilter ? "No one matches these filters" : "No one has registered for this cohort yet"}
            </p>
            {roleFilter && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setRoleFilter(null)}>
                View all cAMPers
              </Button>
            )}
          </div>
        )}
      </div>

      <CohortMemberDialog member={openMember} onClose={closeMember} />
    </div>
  );
}
