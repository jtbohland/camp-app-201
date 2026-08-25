import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreateExecutive",
  description: "Adds a new executive to the speaker bank",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    name: z.string(),
    title: z.string(),
    photo_url: z.string().nullable(),
    bio: z.string().nullable(),
    linkedin_url: z.string().nullable(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { name, title, photo_url, bio, linkedin_url }) {
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_executives (name, title, photo_url, bio, linkedin_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [name, title, photo_url ?? "", bio ?? "", linkedin_url ?? ""],
      { label: "Create executive" }
    );

    return { id: result[0].id, success: true };
  },
});
