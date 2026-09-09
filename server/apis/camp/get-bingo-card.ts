import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const SquareSchema = z.object({
  idx: z.number(),
  fact: z.string(),
  owner_camper_id: z.number(),
  is_free: z.boolean(),
});

const CardOutputSchema = z.object({
  card: z.array(SquareSchema),
  found_squares: z.record(z.string(), z.number()),
  last_wrong_guess_camper_id: z.number().nullable(),
  score: z.number(),
  bingos_claimed: z.array(z.string()),
  penalty_count: z.number(),
  camper_names: z.array(z.object({ id: z.coerce.number(), first_name: z.string(), last_name: z.string() })),
});

export default api({
  name: "GetBingoCard",
  description: "Gets or generates a shuffled bingo card for a camper",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    camper_id: z.number(),
    is_admin: z.boolean().optional(),
  }),
  output: CardOutputSchema,
  async run(ctx, { presentation_id, camper_id, is_admin }) {
    // Check for existing card
    const existing = await ctx.integrations.apps_database.query(
      `SELECT card, found_squares, last_wrong_guess_camper_id, score, bingos_claimed, penalty_count
       FROM camp201_bingo_cards WHERE presentation_id = $1 AND camper_id = $2 LIMIT 1`,
      z.object({
        card: z.any(), found_squares: z.any(), last_wrong_guess_camper_id: z.coerce.number().nullable(),
        score: z.coerce.number(), bingos_claimed: z.any(), penalty_count: z.coerce.number(),
      }),
      [presentation_id, camper_id],
      { label: "Check existing bingo card" }
    );

    // Always get camper names for the dropdown
    const campers = await ctx.integrations.apps_database.query(
      `SELECT id, first_name, last_name FROM camp201_campers
       WHERE role NOT IN ('counselor', 'admin') AND id != $1
       ORDER BY first_name LIMIT 50`,
      z.object({ id: z.coerce.number(), first_name: z.string(), last_name: z.string() }),
      [camper_id],
      { label: "Get camper names for dropdown" }
    );

    if (existing.length > 0) {
      const e = existing[0];
      const card = typeof e.card === "string" ? JSON.parse(e.card) : e.card;
      // If card has content (not reset), return it
      if (Array.isArray(card) && card.length === 25) {
        const found = typeof e.found_squares === "string" ? JSON.parse(e.found_squares) : e.found_squares;
        const bingos = typeof e.bingos_claimed === "string" ? JSON.parse(e.bingos_claimed) : e.bingos_claimed;
        return {
          card,
          found_squares: found as Record<string, number>,
          last_wrong_guess_camper_id: e.last_wrong_guess_camper_id,
          score: e.score,
          bingos_claimed: bingos as string[],
          penalty_count: e.penalty_count,
          camper_names: campers,
        };
      }
      // Card was reset — will regenerate below
    }

    // Generate a new card — gather fun facts from all non-admin campers
    const facts = await ctx.integrations.apps_database.query(
      `SELECT id, first_name, fun_fact, ice_breaker_q1, ice_breaker_q2, ice_breaker_q3, city, region
       FROM camp201_campers
       WHERE role NOT IN ('counselor', 'admin')
         AND (fun_fact IS NOT NULL OR ice_breaker_q1 IS NOT NULL)
       LIMIT 50`,
      z.object({
        id: z.coerce.number(), first_name: z.string(),
        fun_fact: z.string().nullable(), ice_breaker_q1: z.string().nullable(),
        ice_breaker_q2: z.string().nullable(), ice_breaker_q3: z.string().nullable(),
        city: z.string().nullable(), region: z.string().nullable(),
      }),
      undefined,
      { label: "Gather fun facts from cohort" }
    );

    // Build fact pool: each camper contributes multiple facts
    const factPool: { fact: string; camper_id: number }[] = [];
    for (const c of facts) {
      if (c.fun_fact?.trim()) factPool.push({ fact: c.fun_fact.trim(), camper_id: c.id });
      if (c.ice_breaker_q1?.trim()) factPool.push({ fact: c.ice_breaker_q1.trim(), camper_id: c.id });
      if (c.ice_breaker_q2?.trim()) factPool.push({ fact: c.ice_breaker_q2.trim(), camper_id: c.id });
      if (c.ice_breaker_q3?.trim()) factPool.push({ fact: c.ice_breaker_q3.trim(), camper_id: c.id });
      if (c.city?.trim()) factPool.push({ fact: `Lives in ${c.city.trim()}`, camper_id: c.id });
    }

    // We need 24 facts (25 squares minus 1 free center)
    // Ensure each camper appears at least once
    const camperIds = [...new Set(factPool.map((f) => f.camper_id))];
    const selected: typeof factPool = [];

    // First pass: one fact per camper
    for (const cid of camperIds) {
      const camperFacts = factPool.filter((f) => f.camper_id === cid);
      if (camperFacts.length > 0 && selected.length < 24) {
        const pick = camperFacts[Math.floor(seededRandom(camper_id + cid) * camperFacts.length)];
        selected.push(pick);
      }
    }

    // Second pass: fill to 24 with remaining facts
    const usedFacts = new Set(selected.map((s) => s.fact));
    const remaining = factPool.filter((f) => !usedFacts.has(f.fact));
    // Shuffle remaining with seed
    const shuffledRemaining = shuffleWithSeed(remaining, camper_id + 999);
    for (const f of shuffledRemaining) {
      if (selected.length >= 24) break;
      selected.push(f);
    }

    // If still not 24 (very small cohort), pad with generic camp facts
    const genericFacts = [
      "Has been camping before", "Prefers coffee over tea", "Has a pet at home",
      "Plays a musical instrument", "Has traveled to 5+ countries", "Is a morning person",
      "Speaks more than one language", "Has run a marathon", "Loves hiking",
      "Has a hidden talent", "Collects something unusual", "Has met a celebrity",
      "Can cook a great meal", "Has binge-watched a show this month", "Prefers mountains over beach",
      "Has a go-to karaoke song", "Has lived in another country", "Is a night owl",
      "Has a green thumb", "Has skydived or bungee jumped", "Reads more than 10 books a year",
      "Has a secret snack weakness", "Can do a cartwheel", "Has a tattoo",
    ];
    let gIdx = 0;
    while (selected.length < 24 && gIdx < genericFacts.length) {
      selected.push({ fact: genericFacts[gIdx], camper_id: 0 });
      gIdx++;
    }

    // Shuffle the 24 facts uniquely per camper
    const shuffled = shuffleWithSeed(selected.slice(0, 24), camper_id);

    // Build 5x5 grid with FREE center (index 12)
    const card = shuffled.map((f, i) => ({
      idx: i >= 12 ? i + 1 : i,
      fact: f.fact,
      owner_camper_id: f.camper_id,
      is_free: false,
    }));
    // Insert FREE square at position 12
    card.splice(12, 0, { idx: 12, fact: "🏕️ FREE", owner_camper_id: 0, is_free: true });

    // Save to DB
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_bingo_cards (presentation_id, camper_id, card, found_squares, score, bingos_claimed, penalty_count, updated_at)
       VALUES ($1, $2, $3::jsonb, '{}'::jsonb, 0, '[]'::jsonb, 0, NOW())
       ON CONFLICT (presentation_id, camper_id)
       DO UPDATE SET card = $3::jsonb, found_squares = '{}'::jsonb, score = 0, bingos_claimed = '[]'::jsonb, updated_at = NOW()`,
      [presentation_id, camper_id, JSON.stringify(card)],
      { label: "Save generated bingo card" }
    );

    return {
      card,
      found_squares: {} as Record<string, number>,
      last_wrong_guess_camper_id: null,
      score: 0,
      bingos_claimed: [],
      penalty_count: 0,
      camper_names: campers,
    };
  },
});

// Seeded random number generator
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Shuffle array with a seed for deterministic per-camper cards
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
