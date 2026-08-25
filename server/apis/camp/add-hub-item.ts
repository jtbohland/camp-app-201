import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddHubItem",
  description: "Adds a note, resource, or idea to a team hub section",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
    author_id: z.number(),
    section: z.string(),
    item_type: z.string(),
    title: z.string(),
    content: z.string().nullable(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { team_id, author_id, section, item_type, title, content }) {
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_hub_items (team_id, author_id, section, item_type, title, content)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [team_id, author_id, section, item_type, title, content ?? ""],
      { label: "Add hub item" }
    );

    return { id: result[0].id, success: true };
  },
});
