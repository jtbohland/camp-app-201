import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateCounselorProfile",
  description: "Updates a counselor's profile from the Hub",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
    photo_url: z.string().nullable(),
    bio: z.string().nullable(),
    fun_fact: z.string().nullable(),
    linkedin_url: z.string().nullable(),
    // YYYY-MM-DD
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    country: z.string().max(80).nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    // Always update the signed-in counselor's own profile.
    const email = (ctx.user.email ?? input.email).toLowerCase();
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_campers SET
        photo_url = $2,
        bio = $3,
        fun_fact = $4,
        linkedin_url = $5,
        start_date = $6::date,
        country = $7,
        updated_at = NOW()
      WHERE lower(email) = $1 AND role IN ('counselor', 'admin')`,
      [email, input.photo_url, input.bio, input.fun_fact, input.linkedin_url, input.start_date, input.country],
      { label: "Update counselor profile" }
    );
    return { success: true };
  },
});
