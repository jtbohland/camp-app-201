import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateCounselorProfile",
  description: "Updates a counselor's profile (photo, bio, fun fact) from the Hub",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
    photo_url: z.string().nullable(),
    bio: z.string().nullable(),
    fun_fact: z.string().nullable(),
    linkedin_url: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_campers SET
        photo_url = $2,
        bio = $3,
        fun_fact = $4,
        linkedin_url = $5,
        updated_at = NOW()
      WHERE email = $1 AND role IN ('counselor', 'admin')`,
      [input.email, input.photo_url, input.bio, input.fun_fact, input.linkedin_url],
      { label: "Update counselor profile" }
    );
    return { success: true };
  },
});
