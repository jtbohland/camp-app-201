/**
 * The three cAMP regions. Values are normalized in SQL by camp201_map_region(region, country)
 * (migration 0019); keep in sync with client/lib/regions.ts.
 */
export const REGIONS = ["NAMER", "EMEA", "APAC"] as const;
export type Region = (typeof REGIONS)[number];

/**
 * SQL for a cAMPer's manager name. The counselor's new-hire CSV wins; then what the cAMPer typed
 * (ignoring placeholders like "Other"); then a registered manager's name from their email.
 * `c` is the camp201_campers alias.
 */
export const MANAGER_NAME_SQL = `COALESCE(
  (SELECT NULLIF(btrim(nh.manager_name), '') FROM camp201_new_hires nh
    WHERE lower(nh.email) = lower(c.email) ORDER BY nh.updated_at DESC NULLS LAST, nh.id DESC LIMIT 1),
  CASE WHEN lower(btrim(COALESCE(c.manager, ''))) IN ('', 'other', 'n/a', 'na', 'none', '-', 'tbd', 'unknown', '?')
       THEN NULL ELSE btrim(c.manager) END,
  (SELECT NULLIF(btrim(concat(m.first_name, ' ', m.last_name)), '') FROM camp201_campers m
    WHERE c.manager_email IS NOT NULL AND lower(m.email) = lower(c.manager_email) LIMIT 1))`;
