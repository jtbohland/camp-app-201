import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "VerifyCounselor",
  description: "Checks the counselor password and grants admin access",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    password: z.string().max(200),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { password }) {
    const email = (ctx.user.email ?? "").toLowerCase();
    if (!email) throw new Error("You must be signed in to verify as a counselor.");

    // Compare against the stored hash in SQL so the password never leaves the database.
    const match = await ctx.integrations.camp_201_db.query(
      `SELECT 1 AS ok FROM camp201_app_secrets
       WHERE key = 'counselor_password_sha256'
         AND value = encode(sha256(convert_to($1, 'UTF8')), 'hex')
       LIMIT 1`,
      z.object({ ok: z.coerce.number() }),
      [password],
      { label: "Check counselor password" }
    );
    if (match.length === 0) return { success: false };

    const displayName = ctx.user.name ?? email.split("@")[0];
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_admins (email, name) VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [email, displayName],
      { label: "Add to admin list" }
    );

    // Give them a counselor profile so they appear in Counselor Cabin + Rotation.
    // Reuse an existing record (any email casing) before creating a new one.
    const updated = await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_campers SET role = 'counselor', updated_at = NOW()
       WHERE lower(email) = $1`,
      [email],
      { label: "Promote existing record to counselor" }
    );

    if (!updated.rowCount) {
      const parts = displayName.trim().split(/\s+/);
      await ctx.integrations.camp_201_db.execute(
        `INSERT INTO camp201_campers (email, first_name, last_name, role, cohort_id, visible_in_cohort)
         VALUES ($1, $2, $3, 'counselor',
                 (SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1), true)
         ON CONFLICT (email) DO NOTHING`,
        [email, parts[0] ?? "", parts.slice(1).join(" ")],
        { label: "Create counselor profile" }
      );
    }

    return { success: true };
  },
});
