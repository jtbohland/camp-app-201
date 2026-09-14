import { z } from "@superblocksteam/sdk-api";

/**
 * Checks if camp is closed. Returns true if camp_closed = 'true' in config.
 * Use this at the top of any point-earning API to reject new submissions.
 */
export async function isCampClosed(db: any): Promise<boolean> {
  const result = await db.query(
    `SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1`,
    z.object({ value: z.string() }),
    undefined,
    { label: "Check camp_closed guard" }
  );
  return result.length > 0 && result[0].value === "true";
}
