import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCountryStyle, getCountryDisplayName } from "@/lib/countryUtils.js";
import { pluralRoleGroup, type RoleGroup } from "@/lib/roles.js";
import type { CohortMember } from "@/lib/cohortMember.js";

type Props = {
  cohortName: string | null;
  members: CohortMember[];
  roleCounts: ReadonlyArray<readonly [RoleGroup, number]>;
  activeRole: RoleGroup | null;
  onRoleClick: (group: RoleGroup) => void;
};

/** Green banner at the top of the Cohort page: totals + clickable role pills. */
export default function CohortHeroStats({ cohortName, members, roleCounts, activeRole, onRoleClick }: Props) {
  const teamCount = useMemo(() => new Set(members.map((m) => m.team_name).filter(Boolean)).size, [members]);

  const countryList = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (!m.country) continue;
      const canonical = getCountryDisplayName(m.country) ?? m.country;
      const style = getCountryStyle(m.country);
      if (style) map.set(canonical, style.flag);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [members]);

  return (
    <div className="rounded-xl bg-gradient-to-r from-camp-green/90 to-emerald-700 p-5 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            🏕️ {!cohortName ? "cAMP 201" : /camp\s*201/i.test(cohortName) ? cohortName : `${cohortName} — cAMP 201`}
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
                  <div className="text-2xl font-bold tabular-nums">{countryList.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/60">Countries</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white max-w-sm p-3">
                <p className="font-semibold text-xs mb-2">Representing {countryList.length} countries</p>
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

      {/* Role pills: click to show only that role */}
      {roleCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {roleCounts.map(([group, count]) => {
            const active = activeRole === group;
            return (
              <button
                key={group}
                type="button"
                onClick={() => onRoleClick(group)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-white bg-white text-emerald-800"
                    : "border-white/25 bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {pluralRoleGroup(group, count)}
              </button>
            );
          })}
          <span className="ml-1 text-[10px] text-white/60">Tap a role to filter</span>
        </div>
      )}
    </div>
  );
}
