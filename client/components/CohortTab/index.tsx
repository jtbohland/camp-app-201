import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCountryStyle, getCountryDisplayName } from "@/lib/countryUtils.js";
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
  start_date: string | null;
};

export default function CohortTab() {
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

  const teamCount = useMemo(() => {
    const teams = new Set<string>();
    members.forEach((m: CohortMember) => { if (m.team_name) teams.add(m.team_name); });
    return teams.size;
  }, [members]);

  const countryList = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m: CohortMember) => {
      if (m.country) {
        const canonical = getCountryDisplayName(m.country) ?? m.country;
        const style = getCountryStyle(m.country);
        if (style) map.set(canonical, style.flag);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [members]);
  const countryCount = countryList.length;

  const roleCounts = useMemo(() => {
    const map = new Map<string, number>();
    const ROLE_ABBREVS: Record<string, string> = {
      "account executive": "AEs", "solutions engineer": "SEs",
      "sales development": "SDRs", "customer success": "CSMs",
      "technical success": "TSMs", "renewal": "Renewal",
      "partner": "Partners", "velocity": "Velocity",
    };
    campers.forEach((m: CohortMember) => {
      const role = m.role?.toLowerCase() ?? "";
      let label = "Other";
      for (const [key, abbr] of Object.entries(ROLE_ABBREVS)) {
        if (role.includes(key)) { label = abbr; break; }
      }
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [campers]);

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

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Cohort Hero Stats */}
      <div className="rounded-xl bg-gradient-to-r from-camp-green/90 to-emerald-700 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              🏕️ Cohort 8 — cAMP 201
            </h2>
            <p className="text-sm text-white/70 mt-0.5">Your fellow cAMPers on this journey</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">{members.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/60">cAMPers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">{teamCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/60">Teams</div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-pointer">
                    <div className="text-2xl font-bold tabular-nums">{countryCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60">Countries</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white max-w-sm p-3">
                  <p className="font-semibold text-xs mb-2">Representing {countryCount} countries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {countryList.map(([name, flag]) => {
                      const style = getCountryStyle(name);
                      return (
                        <span key={name} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style?.bg ?? "bg-gray-100"} ${style?.text ?? "text-gray-700"}`}>
                          {flag} {name.replace(/^the /, "")}
                        </span>
                      );
                    })}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {/* Role distribution mini pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {roleCounts.map(([role, count]) => (
            <Badge key={role} className="bg-white/15 text-white border-white/20 text-[10px]">
              {count} {role}
            </Badge>
          ))}
        </div>
      </div>
      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {members.length} members in this cohort
        </p>
        <div className="relative w-full max-w-xs">
          <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={localSearch}
            onChange={handleSearchChange}
            placeholder="Search by name, role, region..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

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
