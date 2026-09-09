import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const POINTS_PER_SQUARE = 2;
const BINGO_BONUSES = [15, 10, 7, 3, 3, 3, 3, 3, 3, 3, 3, 3];
const BLACKOUT_BONUS = 20;
const CHEAT_PENALTY = -2;

// All possible bingo lines (rows, cols, diags) on a 5x5 grid
const BINGO_LINES = [
  [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
  [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
  [0,6,12,18,24], [4,8,12,16,20],
];

export default api({
  name: "SubmitBingoGuess",
  description: "Validates a bingo square guess with anti-cheat enforcement",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    camper_id: z.number(),
    square_idx: z.number(),
    guessed_camper_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    correct: z.boolean(),
    message: z.string(),
    points_delta: z.number(),
    new_bingos: z.array(z.string()),
    is_blackout: z.boolean(),
    penalty: z.boolean(),
  }),
  async run(ctx, { presentation_id, camper_id, square_idx, guessed_camper_id }) {
    // Get the card
    const cards = await ctx.integrations.apps_database.query(
      `SELECT card, found_squares, last_wrong_guess_camper_id, score, bingos_claimed, penalty_count
       FROM camp201_bingo_cards WHERE presentation_id = $1 AND camper_id = $2 LIMIT 1`,
      z.object({
        card: z.any(), found_squares: z.any(), last_wrong_guess_camper_id: z.coerce.number().nullable(),
        score: z.coerce.number(), bingos_claimed: z.any(), penalty_count: z.coerce.number(),
      }),
      [presentation_id, camper_id],
      { label: "Get bingo card for guess" }
    );

    if (cards.length === 0) {
      return { success: false, correct: false, message: "No card found", points_delta: 0, new_bingos: [], is_blackout: false, penalty: false };
    }

    const row = cards[0];
    const card = (typeof row.card === "string" ? JSON.parse(row.card) : row.card) as any[];
    const found = (typeof row.found_squares === "string" ? JSON.parse(row.found_squares) : row.found_squares) as Record<string, number>;
    const bingos = (typeof row.bingos_claimed === "string" ? JSON.parse(row.bingos_claimed) : row.bingos_claimed) as string[];

    // Find the square
    const square = card.find((s: any) => s.idx === square_idx);
    if (!square) {
      return { success: false, correct: false, message: "Square not found", points_delta: 0, new_bingos: [], is_blackout: false, penalty: false };
    }

    // Already found?
    if (found[String(square_idx)] !== undefined) {
      return { success: false, correct: false, message: "You already found this one!", points_delta: 0, new_bingos: [], is_blackout: false, penalty: false };
    }

    // ANTI-CHEAT: Check if they're picking the same person back-to-back after a wrong guess
    if (row.last_wrong_guess_camper_id !== null && row.last_wrong_guess_camper_id === guessed_camper_id) {
      const newPenalty = row.penalty_count + 1;
      const newScore = row.score + CHEAT_PENALTY;
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_bingo_cards SET penalty_count = $3, score = $4, updated_at = NOW()
         WHERE presentation_id = $1 AND camper_id = $2`,
        [presentation_id, camper_id, newPenalty, newScore],
        { label: "Apply cheat penalty" }
      );
      // Log event
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_bingo_events (presentation_id, camper_id, event_type, detail)
         VALUES ($1, $2, 'penalty', $3::jsonb)`,
        [presentation_id, camper_id, JSON.stringify({ guessed_camper_id, square_idx })],
        { label: "Log penalty event" }
      );
      return {
        success: true, correct: false, penalty: true,
        message: "🚫 You didn't move! Same person as last time. -2 points.",
        points_delta: CHEAT_PENALTY, new_bingos: [], is_blackout: false,
      };
    }

    // Check if guess is correct
    const isCorrect = square.owner_camper_id === guessed_camper_id;

    if (!isCorrect) {
      // Wrong guess — remember who they guessed for anti-cheat
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_bingo_cards SET last_wrong_guess_camper_id = $3, updated_at = NOW()
         WHERE presentation_id = $1 AND camper_id = $2`,
        [presentation_id, camper_id, guessed_camper_id],
        { label: "Record wrong guess for anti-cheat" }
      );
      return {
        success: true, correct: false, penalty: false,
        message: "Not quite! Move on to someone new. 🏃",
        points_delta: 0, new_bingos: [], is_blackout: false,
      };
    }

    // CORRECT! 🔥
    found[String(square_idx)] = guessed_camper_id;
    let pointsDelta = POINTS_PER_SQUARE;

    // Clear the anti-cheat lock (they got it right, can pick anyone next)
    // Check for new bingos
    const foundIdxs = new Set([...Object.keys(found).map(Number), 12]); // 12 is always FREE
    const newBingos: string[] = [];

    for (const line of BINGO_LINES) {
      const lineKey = line.join("-");
      if (bingos.includes(lineKey)) continue;
      if (line.every((idx) => foundIdxs.has(idx))) {
        newBingos.push(lineKey);
        bingos.push(lineKey);
      }
    }

    // Bingo bonus points
    for (const _ of newBingos) {
      const bingoNum = bingos.length; // which bingo number this is
      const bonus = BINGO_BONUSES[Math.min(bingoNum - 1, BINGO_BONUSES.length - 1)];
      pointsDelta += bonus;
    }

    // Check blackout (all 24 non-free squares found)
    const isBlackout = Object.keys(found).length >= 24;
    if (isBlackout) {
      pointsDelta += BLACKOUT_BONUS;
    }

    const newScore = row.score + pointsDelta;

    // Update card
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_bingo_cards
       SET found_squares = $3::jsonb, score = $4, bingos_claimed = $5::jsonb,
           last_wrong_guess_camper_id = NULL, updated_at = NOW()
       WHERE presentation_id = $1 AND camper_id = $2`,
      [presentation_id, camper_id, JSON.stringify(found), newScore, JSON.stringify(bingos)],
      { label: "Update bingo card with correct guess" }
    );

    // Log events
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_bingo_events (presentation_id, camper_id, event_type, detail)
       VALUES ($1, $2, 'correct', $3::jsonb)`,
      [presentation_id, camper_id, JSON.stringify({ square_idx, guessed_camper_id, points: pointsDelta })],
      { label: "Log correct guess event" }
    );

    // Also award points to the main points log
    if (pointsDelta > 0) {
      const reason = newBingos.length > 0
        ? `Fireside Finder: correct guess + BINGO!`
        : `Fireside Finder: correct guess`;
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, category, cohort_id)
         VALUES ($1, $2, $3, 'bingo', 4)`,
        [camper_id, pointsDelta, reason],
        { label: "Award bingo points" }
      );
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $2 WHERE id = $1`,
        [camper_id, pointsDelta],
        { label: "Update camper total points" }
      );
    }

    const bingoMsg = newBingos.length > 0 ? ` 🎉 BINGO! +${BINGO_BONUSES[0]} bonus!` : "";
    const blackoutMsg = isBlackout ? ` 🏆 BLACKOUT! +${BLACKOUT_BONUS} bonus!` : "";

    return {
      success: true, correct: true, penalty: false,
      message: `🔥 Correct! +${pointsDelta} points.${bingoMsg}${blackoutMsg}`,
      points_delta: pointsDelta,
      new_bingos: newBingos,
      is_blackout: isBlackout,
    };
  },
});
