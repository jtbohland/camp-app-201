import { z } from "@superblocksteam/sdk-api";

export type BingoGameState = { closed: boolean; closedAt: string | null; revealed: boolean };

/** Whether a Fireside Finder game has been ended and whether answers are shown to everyone. */
export async function getBingoGameState(db: any, presentationId: number): Promise<BingoGameState> {
  const rows = await db.query(
    `SELECT to_char(bingo_closed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS closed_at,
            COALESCE(bingo_revealed, false) AS revealed
     FROM camp201_presentations WHERE id = $1 LIMIT 1`,
    z.object({ closed_at: z.string().nullable(), revealed: z.boolean() }),
    [presentationId],
    { label: "Fireside Finder: game state" }
  );
  const r = rows[0];
  return { closed: !!r?.closed_at, closedAt: r?.closed_at ?? null, revealed: r?.revealed ?? false };
}
