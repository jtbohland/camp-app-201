import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ALLOWED = [
  "vegetarian", "vegan", "pescatarian", "gluten_free", "dairy_free", "low_carb",
  "nut_allergy", "peanut_allergy", "shellfish_allergy", "fish_allergy", "egg_allergy", "soy_allergy", "sesame_allergy",
  "halal", "kosher", "no_pork", "no_beef", "jain", "other",
] as const;

/** Optional dietary considerations. Not part of pre-work or profile completion, no points. */
export default api({
  name: "UpdateDietary",
  description: "Saves the signed-in cAMPer's optional dietary considerations",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    options: z.array(z.enum(ALLOWED)).max(ALLOWED.length),
    notes: z.string().trim().max(1000).nullable(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { options, notes }) {
    const email = (ctx.user.email ?? "").trim();
    if (!email) throw new Error("You must be signed in.");

    const rows = await ctx.integrations.camp_201_db.query(
      `WITH updated AS (
         UPDATE camp201_campers
         SET dietary_options = $2::jsonb, dietary_notes = NULLIF($3, ''), updated_at = NOW()
         WHERE lower(email) = lower($1) AND removed_at IS NULL
         RETURNING id
       )
       SELECT id FROM updated LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [email, JSON.stringify([...new Set(options)]), notes ?? ""],
      { label: "Save dietary considerations" }
    );
    if (rows.length === 0) throw new Error("We couldn't find your cAMPer profile.");

    return { success: true };
  },
});
