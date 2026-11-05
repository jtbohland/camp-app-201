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

// AE flavors only apply to Account Executive titles. Keep in sync with camp201_map_role() (migration 0019).
const AE = /(account executive|\bae\b)/;
const RULES: { pattern: RegExp; role: StandardRole; ae?: boolean }[] = [
  { pattern: /strategic/, role: "AE – Strategic", ae: true },
  { pattern: /emerging/, role: "AE – Emerging", ae: true },
  { pattern: /(velocity|commercial|mid-?market|corporate)/, role: "AE – Velocity", ae: true },
  { pattern: /(enterprise|major)/, role: "AE – Enterprise", ae: true },
  { pattern: /(sales development|business development|\bsdr\b|\bbdr\b)/, role: "SDR" },
  { pattern: /(success architect|solutions? architect|engagement manager|\bcsa\b)/, role: "CSA" },
  { pattern: /(solutions? engineer|sales engineer|pre-?sales|\bse\b)/, role: "SE" },
  { pattern: /renewal/, role: "Renewals" },
  { pattern: /(technical success|customer success|\btsm\b|\bcsm\b)/, role: "TSM" },
  { pattern: /partner/, role: "Partners" },
  { pattern: /value/, role: "Value" },
  { pattern: /(vice president|\bavp\b|\brvp\b|\bvp\b|director|head of|manager|leader|\blead\b|chief|\bcro\b)/, role: "Leadership" },
];

/** "AE - Enterprise" / "AE—Enterprise" → "AE – Enterprise". */
const normalizeDashes = (s: string) => s.replace(/\s*[-–—]\s*/g, " – ");

/** Maps any job title to one of the 12 standard roles, or null when it can't tell. */
export function mapToStandardRole(title: string | null | undefined): StandardRole | null {
  const raw = (title ?? "").trim();
  if (!raw) return null;
  const dashed = normalizeDashes(raw);
  const exact = STANDARD_ROLES.find((r) => r === dashed);
  if (exact) return exact;
  const l = raw.toLowerCase();
  const isAe = AE.test(l);
  for (const rule of RULES) if ((!rule.ae || isAe) && rule.pattern.test(l)) return rule.role;
  return null;
}

export function isStandardRole(role: string | null | undefined): role is StandardRole {
  return !!role && (STANDARD_ROLES as readonly string[]).includes(role);
}
