/**
 * The 12 standard cAMP roles and how they look. Keep in sync with server/lib/roles.ts
 * and the camp201_map_role() SQL function (migration 0017).
 */
export const STANDARD_ROLES = [
  "SDR",
  "AE – Velocity",
  "AE – Emerging",
  "AE – Enterprise",
  "AE – Strategic",
  "SE",
  "CSA",
  "TSM",
  "Renewals",
  "Partners",
  "Value",
  "Leadership",
] as const;

export type StandardRole = (typeof STANDARD_ROLES)[number];

/** Longer hint shown under each role in the registration dropdown. */
export const ROLE_HINTS: Partial<Record<StandardRole, string>> = {
  SDR: "Sales / Business Development Rep",
  "AE – Velocity": "Account Executive",
  "AE – Emerging": "Account Executive",
  "AE – Enterprise": "Account Executive",
  "AE – Strategic": "Account Executive",
  SE: "Solutions Engineer",
  CSA: "Solutions Architect, Engagement Manager",
  TSM: "Technical Success Manager (includes CSM)",
  Renewals: "Renewal Manager",
  Partners: "Partner team",
  Value: "Value team",
  Leadership: "Manager, Director, VP",
};

export type RoleStyle = { bg: string; border: string; pill: string; text: string };

/** Short group shown on pills + role filters. All AE flavors group to "AE". */
export type RoleGroup = "SDR" | "AE" | "SE" | "CSA" | "TSM" | "Renewals" | "Partners" | "Value" | "Leadership";

export const ROLE_GROUP_ORDER: RoleGroup[] = ["SDR", "AE", "SE", "CSA", "TSM", "Renewals", "Partners", "Value", "Leadership"];

const GROUP_STYLES: Record<RoleGroup, Omit<RoleStyle, "text">> = {
  SDR:        { bg: "bg-amber-50",   border: "border-amber-200",   pill: "bg-amber-100 text-amber-700" },
  AE:         { bg: "bg-blue-50",    border: "border-blue-200",    pill: "bg-blue-100 text-blue-700" },
  SE:         { bg: "bg-purple-50",  border: "border-purple-200",  pill: "bg-purple-100 text-purple-700" },
  CSA:        { bg: "bg-fuchsia-50", border: "border-fuchsia-200", pill: "bg-fuchsia-100 text-fuchsia-700" },
  TSM:        { bg: "bg-teal-50",    border: "border-teal-200",    pill: "bg-teal-100 text-teal-700" },
  Renewals:   { bg: "bg-lime-50",    border: "border-lime-200",    pill: "bg-lime-100 text-lime-700" },
  Partners:   { bg: "bg-orange-50",  border: "border-orange-200",  pill: "bg-orange-100 text-orange-700" },
  Value:      { bg: "bg-emerald-50", border: "border-emerald-200", pill: "bg-emerald-100 text-emerald-700" },
  Leadership: { bg: "bg-rose-50",    border: "border-rose-200",    pill: "bg-rose-100 text-rose-700" },
};

const COUNSELOR_STYLE: RoleStyle = { bg: "bg-primary/5", border: "border-primary/40", pill: "bg-primary/10 text-primary", text: "Counselor" };
const DEFAULT_STYLE: RoleStyle = { bg: "bg-card", border: "border-border", pill: "bg-secondary text-secondary-foreground", text: "" };

const RULES: { pattern: RegExp; role: StandardRole }[] = [
  { pattern: /strategic/, role: "AE – Strategic" },
  { pattern: /emerging/, role: "AE – Emerging" },
  { pattern: /velocity/, role: "AE – Velocity" },
  { pattern: /^(?!.*(vice president|\bavp\b|\bvp\b|director|manager|head of)).*enterprise/, role: "AE – Enterprise" },
  { pattern: /(sales development|business development|\bsdr\b|\bbdr\b)/, role: "SDR" },
  { pattern: /(solutions? architect|engagement manager|\bcsa\b)/, role: "CSA" },
  { pattern: /(solutions? engineer|sales engineer|pre-?sales|\bse\b)/, role: "SE" },
  { pattern: /renewal/, role: "Renewals" },
  { pattern: /(technical success|customer success|\btsm\b|\bcsm\b)/, role: "TSM" },
  { pattern: /partner/, role: "Partners" },
  { pattern: /value/, role: "Value" },
  { pattern: /(vice president|\bavp\b|\brvp\b|\bvp\b|director|head of|manager|leadership|\blead\b|chief|\bcro\b)/, role: "Leadership" },
];

/** Maps any job title to one of the 12 standard roles, or null when it can't tell. */
export function mapToStandardRole(title: string | null | undefined): StandardRole | null {
  const raw = (title ?? "").trim();
  if (!raw) return null;
  const exact = STANDARD_ROLES.find((r) => r === raw);
  if (exact) return exact;
  const l = raw.toLowerCase();
  for (const rule of RULES) if (rule.pattern.test(l)) return rule.role;
  return null;
}

export function isCounselorRole(role: string | null | undefined): boolean {
  return role === "counselor" || role === "admin";
}

/** The short group for a role ("AE – Strategic" → "AE"). Null for counselors or unknown roles. */
export function getRoleGroup(role: string | null | undefined): RoleGroup | null {
  if (isCounselorRole(role)) return null;
  const std = mapToStandardRole(role);
  if (!std) return null;
  return std.startsWith("AE") ? "AE" : (std as RoleGroup);
}

/** Pill label + colors for any stored role. */
export function getRoleStyle(role: string | null | undefined): RoleStyle {
  if (isCounselorRole(role)) return COUNSELOR_STYLE;
  const group = getRoleGroup(role);
  if (!group) return { ...DEFAULT_STYLE, text: role ?? "" };
  return { ...GROUP_STYLES[group], text: group };
}

/** Plural label for role counts ("5 AEs", "1 Leadership"). */
export function pluralRoleGroup(group: RoleGroup, count: number): string {
  if (count === 1 || group === "Leadership" || group === "Renewals" || group === "Partners" || group === "Value") {
    return `${count} ${group}`;
  }
  return `${count} ${group}s`;
}
