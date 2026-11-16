import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";
import { getBingoGameState } from "../../lib/bingo-state.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SetBingoGameState",
  description: "Counselor ends/reopens Fireside Finder and reveals answers",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    /** true = end the game (no more guesses or points), false = reopen, null = unchanged. */
    closed: z.boolean().nullable(),
    /** true = show every square's answer to everyone, false = hide, null = unchanged. */
    revealed: z.boolean().nullable(),
  }),
  output: z.object({ closed: z.boolean(), closedAt: z.string().nullable(), revealed: z.boolean() }),
  async run(ctx, { presentation_id, closed, revealed }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    // Revealing answers always ends the game (otherwise anyone could copy the answers for points).
    // Reopening the game hides the answers again.
    const nextClosed = revealed === true ? true : closed;
    const nextRevealed = closed === false ? false : revealed;

    const exists = await db.query(
      `SELECT id FROM camp201_presentations WHERE id = $1 AND presentation_type = 'bingo' LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [presentation_id],
      { label: "Fireside Finder: find game" }
    );
    if (!exists[0]) throw new Error("Fireside Finder game not found.");

    await db.execute(
      `UPDATE camp201_presentations
       SET bingo_closed_at = CASE WHEN $2::boolean IS NULL THEN bingo_closed_at
                                  WHEN $2::boolean THEN COALESCE(bingo_closed_at, NOW())
                                  ELSE NULL END,
           bingo_revealed = COALESCE($3::boolean, bingo_revealed)
       WHERE id = $1 AND presentation_type = 'bingo'`,
      [presentation_id, nextClosed, nextRevealed],
      { label: "Fireside Finder: update game state" }
    );
    return getBingoGameState(db, presentation_id);
  },
});
