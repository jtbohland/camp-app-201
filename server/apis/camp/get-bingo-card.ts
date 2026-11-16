import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, getCounselorAccess, resolveViewCohort } from "../../lib/cohort.js";
import { buildFairCard, type BingoPerson } from "../../lib/bingo.js";
import { getBingoGameState } from "../../lib/bingo-state.js";

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
  /** Counselor ended the game: no more guesses or points. */
  closed: z.boolean(),
  closed_at: z.string().nullable(),
  /** Counselor revealed the answers to everyone. */
  revealed: z.boolean(),
  /** Square owner names by camper id. Only sent to counselors or once answers are revealed. */
  owner_names: z.record(z.string(), z.string()),
});

type Square = z.infer<typeof SquareSchema>;

/** Squares tied to a real cAMPer (not FREE, not generic filler). */
const realSquares = (card: Square[]) => card.filter((s) => !s.is_free && s.owner_camper_id > 0).length;

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
    const db = ctx.integrations.camp_201_db;
    // Viewing cohort (active, or a counselor's chosen past cohort). Past view never creates cards.
    const [view, game, access] = await Promise.all([
      resolveViewCohort(db, ctx.user.email),
      getBingoGameState(db, presentation_id),
      getCounselorAccess(db, ctx.user.email),
    ]);
    const VIEW = cohortIdSql(view.cohortId);
    const showAnswers = game.revealed || (access.isAdmin && is_admin === true);

    /** Names for every square owner on this card, when answers may be shown. */
    const ownerNames = async (card: Square[]): Promise<Record<string, string>> => {
      if (!showAnswers) return {};
      const ids = Array.from(new Set(card.map((s) => s.owner_camper_id).filter((id) => id > 0)));
      if (ids.length === 0) return {};
      const rows = await db.query(
        `SELECT id, TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS name
         FROM camp201_campers WHERE id = ANY($1::int[]) LIMIT 50`,
        z.object({ id: z.coerce.number(), name: z.string() }),
        [ids],
        { label: "Fireside Finder: answer names" }
      );
      return Object.fromEntries(rows.map((r) => [String(r.id), r.name]));
    };
    const extras = async (card: Square[]) => ({
      closed: game.closed,
      closed_at: game.closedAt,
      revealed: game.revealed,
      owner_names: await ownerNames(card),
    });
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
      const found = (typeof e.found_squares === "string" ? JSON.parse(e.found_squares) : e.found_squares) ?? {};
      // A card made before the cohort filled in their profiles is all generic filler: no square belongs
      // to anyone, so nothing can ever be found or revealed. While the game is open, rebuild it.
      const stale = Array.isArray(card) && card.length === 25 && realSquares(card) === 0 && !game.closed && !view.isPast;
      // If card has content (not reset), return it
      if (Array.isArray(card) && card.length === 25 && !stale) {
        const bingos = typeof e.bingos_claimed === "string" ? JSON.parse(e.bingos_claimed) : e.bingos_claimed;
        return {
          card,
          found_squares: found as Record<string, number>,
          last_wrong_guess_camper_id: e.last_wrong_guess_camper_id,
          score: e.score,
          bingos_claimed: bingos as string[],
          penalty_count: e.penalty_count,
          camper_names: campers,
          ...(await extras(card)),
        };
      }
      // Card was reset (or stale) — will regenerate below
    }

    // Read-only past view, or a game that's over: show an empty card rather than generating one.
    if (view.isPast || game.closed) {
      return {
        card: [],
        found_squares: {} as Record<string, number>,
        last_wrong_guess_camper_id: null,
        score: 0,
        bingos_claimed: [],
        penalty_count: 0,
        camper_names: campers,
        ...(await extras([])),
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
      ...(await extras(card)),
    };
  },
});

