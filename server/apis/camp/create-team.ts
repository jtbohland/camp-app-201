import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreateTeam",
  description: "Creates a new team with name, logo, and color",
  integrations: {
    apps_database: postgres(APPS_DB),
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
    const result = await ctx.integrations.apps_database.query(
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
