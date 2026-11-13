import { getRoleGroup, mapToStandardRole, isCounselorRole } from "./roles.js";
import { getCountryDisplayName } from "./countryUtils.js";

/** One person on the Cohort page (from the GetCohort API). */
export type CohortMember = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  /** Full official title from Cohort Management (the new-hire CSV). */
  official_title?: string | null;
  manager: string | null;
  manager_email?: string | null;
  region: string | null;
  country: string | null;
  city: string | null;
  photo_url: string | null;
  /** Counselor's LEGO minifig (transparent PNG). */
  lego_url?: string | null;
  linkedin_url: string | null;
  bio?: string | null;
  fun_fact: string | null;
  points: number;
  team_id: number | null;
  team_name: string | null;
  team_color: string | null;
  team_logo_url: string | null;
  start_date: string | null;
};

export type CohortSort = "name" | "role" | "country" | "tenure";

export const COHORT_SORTS: { value: CohortSort; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "role", label: "Role" },
  { value: "country", label: "Country" },
  { value: "tenure", label: "Newest to Amplitude" },
];

const byName = (a: CohortMember, b: CohortMember) =>
  a.first_name.localeCompare(b.first_name, undefined, { sensitivity: "base" }) ||
  a.last_name.localeCompare(b.last_name, undefined, { sensitivity: "base" });

/** Sorts a copy. Missing values (no role, country, or start date) go last. */
export function sortCohortMembers(list: CohortMember[], sort: CohortSort): CohortMember[] {
  const out = [...list];
  const lastIfEmpty = (a: string, b: string) => (a ? (b ? a.localeCompare(b) : -1) : b ? 1 : 0);
  out.sort((a, b) => {
    if (sort === "role") {
      return lastIfEmpty(mapToStandardRole(a.role) ?? "", mapToStandardRole(b.role) ?? "") || byName(a, b);
    }
    if (sort === "country") {
      return lastIfEmpty(getCountryDisplayName(a.country) ?? "", getCountryDisplayName(b.country) ?? "") || byName(a, b);
    }
    if (sort === "tenure") {
      // Most recent start date first.
      const at = a.start_date ? Date.parse(a.start_date) : NaN;
      const bt = b.start_date ? Date.parse(b.start_date) : NaN;
      if (isNaN(at) && isNaN(bt)) return byName(a, b);
      if (isNaN(at)) return 1;
      if (isNaN(bt)) return -1;
      return bt - at || byName(a, b);
    }
    return byName(a, b);
  });
  return out;
}

export function isCounselorMember(m: CohortMember): boolean {
  return isCounselorRole(m.role);
}

export { getRoleGroup };
