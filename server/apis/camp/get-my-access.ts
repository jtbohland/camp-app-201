import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetMyAccess",
  description: "Returns whether the signed-in user is a verified counselor",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    isAdmin: z.boolean(),
    email: z.string(),
  }),
  async run(ctx) {
    const email = (ctx.user.email ?? "").toLowerCase();
    if (!email) return { isAdmin: false, email: "" };

    // Admin = on the verified admin list, or an existing counselor record.
    const rows = await ctx.integrations.camp_201_db.query(
      `SELECT 1 AS ok FROM camp201_admins WHERE lower(email) = $1
       UNION ALL
       SELECT 1 FROM camp201_campers WHERE lower(email) = $1 AND role IN ('counselor', 'admin')
       LIMIT 1`,
      z.object({ ok: z.coerce.number() }),
      [email],
      { label: "Check admin access" }
    );

    return { isAdmin: rows.length > 0, email };
  },
});
