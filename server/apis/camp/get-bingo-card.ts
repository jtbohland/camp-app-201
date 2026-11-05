import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, resolveViewCohort } from "../../lib/cohort.js";
import { buildFairCard, type BingoPerson } from "../../lib/bingo.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

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
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    camper_id: z.number(),
    is_admin: z.boolean().optional(),
  }),
  output: CardOutputSchema,
  async run(ctx, { presentation_id, camper_id, is_admin }) {
    // Viewing cohort (active, or a counselor's chosen past cohort). Past view never creates cards.
    const view = await resolveViewCohort(ctx.integrations.camp_201_db, ctx.user.email);
    const VIEW = cohortIdSql(view.cohortId);
    // Check for existing card
    const existing = await ctx.integrations.camp_201_db.query(
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
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT id, first_name, last_name FROM camp201_campers
       WHERE role NOT IN ('counselor', 'admin') AND id != $1
         AND cohort_id = ${VIEW}
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

    // Read-only past view: show an empty card rather than generating and saving one.
    if (view.isPast) {
      return {
        card: [],
        found_squares: {} as Record<string, number>,
        last_wrong_guess_camper_id: null,
        score: 0,
        bingos_claimed: [],
        penalty_count: 0,
        camper_names: campers,
      };
    }

    // Generate a new card from everyone else in the cohort (fair mix: see server/lib/bingo.ts).
    const people = await ctx.integrations.camp_201_db.query(
      `SELECT id, first_name, fun_fact, ice_breaker_q1, ice_breaker_q2, ice_breaker_q3, city, country,
              start_date::text AS start_date
       FROM camp201_campers
       WHERE role NOT IN ('counselor', 'admin')
         AND removed_at IS NULL
         AND cohort_id = ${VIEW}
       ORDER BY id
       LIMIT 200`,
      z.object({
        id: z.coerce.number(), first_name: z.string(),
        fun_fact: z.string().nullable(), ice_breaker_q1: z.string().nullable(),
        ice_breaker_q2: z.string().nullable(), ice_breaker_q3: z.string().nullable(),
        city: z.string().nullable(), country: z.string().nullable(), start_date: z.string().nullable(),
      }),
      undefined,
      { label: "Gather cohort for bingo" }
    );

    const others: BingoPerson[] = people.filter((p) => p.id !== camper_id);
    // Card slot: this cAMPer's position in the cohort, so big cohorts rotate who's on each card.
    const slot = Math.max(0, people.findIndex((p) => p.id === camper_id));
    const shuffled = buildFairCard(others, camper_id, people.length, slot);

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
    await ctx.integrations.camp_201_db.execute(
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

