import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { Icon } from "@/components/ui/icon";
import CohortMemberCard from "@/components/CohortMemberCard/index.js";

type CohortMember = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  manager: string | null;
  region: string | null;
  country: string | null;
  city: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  fun_fact: string | null;
  points: number;
  team_id: number | null;
  team_name: string | null;
  team_color: string | null;
  team_logo_url: string | null;
};

export default function CohortPage() {
  const { data, loading, fetching } = useApiData("GetCohort", {});
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(e.target.value), 300);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const members = useMemo(() => {
    const all = data?.members ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((m: CohortMember) =>
      `${m.first_name} ${m.last_name} ${m.role ?? ""} ${m.region ?? ""} ${m.team_name ?? ""}`.toLowerCase().includes(q)
    );
  }, [data, search]);

  const counselors = useMemo(() => members.filter((m: CohortMember) => m.role === "counselor" || m.role === "admin"), [members]);
  const campers = useMemo(() => members.filter((m: CohortMember) => m.role !== "counselor" && m.role !== "admin"), [members]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 w-full animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-full max-w-sm bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Icon icon="contact" className="w-6 h-6 text-primary" />
            cAMP Cohort
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} members in this cohort
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={localSearch}
            onChange={handleSearchChange}
            placeholder="Search by name, role, region..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Refetch indicator */}
      {fetching && !loading && (
        <div className="text-xs text-muted-foreground">Updating...</div>
      )}

      <div className={fetching ? "opacity-70" : ""}>
        {/* Counselors section */}
        {counselors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Icon icon="shield" className="w-4 h-4" />
              Counselors ({counselors.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counselors.map((m: CohortMember) => (
                <CohortMemberCard key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {/* Campers section */}
        {campers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Icon icon="tent" className="w-4 h-4" />
              cAMPers ({campers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campers.map((m: CohortMember) => (
                <CohortMemberCard key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Icon icon="search" className="w-12 h-12 opacity-30 mb-3" />
            <p className="text-sm">No members match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
