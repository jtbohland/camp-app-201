import { z } from "@superblocksteam/sdk-api";

/** Camp Spirit: badge + points awarded when cAMP closes to the most-voted cAMPer. */
export const CAMP_SPIRIT_BADGE_ID = 11;
export const CAMP_SPIRIT_POINTS = 15;

/**
 * Close-out surprise awards (Camp Spirit, Alpine Legend) are written at Close cAMP but stay hidden
 * from cAMPers until the cAMP-V-P reveal, so nobody sees +15 before they know they won.
 * Use with a camp201_points_log alias named `pl`.
 */
export const SURPRISE_ENTRY_SQL = `(pl.reason LIKE 'Camp Spirit:%' OR pl.reason LIKE 'Alpine Legend%')`;
export const SURPRISE_HIDDEN_SQL = `(COALESCE((SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1), 'false') = 'true'
  AND COALESCE((SELECT value FROM camp201_config WHERE key = 'vp_revealed' LIMIT 1), 'false') <> 'true')`;
/** Badges held back until the reveal. */
export const SURPRISE_BADGE_IDS = [11, 105];

export const SpiritWinnerSchema = z.object({
  camper_id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  vote_count: z.coerce.number(),
  note_count: z.coerce.number(),
});

/**
 * Camp Spirit winner(s) for a cohort: most peer votes. A tie goes to whoever received the most
 * kind-word notes; if still tied, they share the award. Only current, non-counselor cAMPers count.
 * Used by Close cAMP (to award) and by the results API (to show the pill after the reveal),
 * so both always agree.
 */
export function spiritWinnersSql(cohortSql: string): string {
  return `WITH tally AS (
     SELECT sv.nominee_id AS camper_id, c.first_name, c.last_name,
            COUNT(*)::int AS vote_count,
            COUNT(NULLIF(btrim(COALESCE(sv.note, '')), ''))::int AS note_count
     FROM camp201_spirit_votes sv
     JOIN camp201_campers c ON c.id = sv.nominee_id
     WHERE sv.cohort_id = ${cohortSql}
       AND c.removed_at IS NULL
       AND (c.role IS NULL OR c.role NOT IN ('counselor', 'admin'))
     GROUP BY sv.nominee_id, c.first_name, c.last_name
   ), ranked AS (
     SELECT *, RANK() OVER (ORDER BY vote_count DESC, note_count DESC) AS rk FROM tally
   )
   SELECT camper_id, first_name, last_name, vote_count, note_count
   FROM ranked WHERE rk = 1 AND vote_count > 0
   ORDER BY camper_id
   LIMIT 20`;
}
