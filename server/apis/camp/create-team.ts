import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CreateTeam",
  description: "Creates a new team with name, logo, and color",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    name: z.string(),
    logo_url: z.string().nullable(),
    color: z.string(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { name, logo_url, color }) {
    const result = await ctx.integrations.camp_201_db.query(
      `INSERT INTO camp201_teams (name, logo_url, color)
       VALUES ($1, $2, $3)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [name, logo_url ?? "", color],
      { label: "Create team" }
    );

    return { id: result[0].id, success: true };
  },
});
