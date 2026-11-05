/**
 * The 12 standard cAMP roles. Keep in sync with client/lib/roles.ts and the
 * camp201_map_role() SQL function (migration 0017).
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

export function isStandardRole(role: string | null | undefined): role is StandardRole {
  return !!role && (STANDARD_ROLES as readonly string[]).includes(role);
}
