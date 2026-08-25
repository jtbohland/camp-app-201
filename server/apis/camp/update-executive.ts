import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateExecutive",
  description: "Updates an executive's profile in the speaker bank",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    name: z.string(),
    title: z.string(),
    photo_url: z.string().nullable(),
    bio: z.string().nullable(),
    linkedin_url: z.string().nullable(),
    is_active: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { id, name, title, photo_url, bio, linkedin_url, is_active }) {
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_executives
       SET name = $1, title = $2, photo_url = $3, bio = $4, linkedin_url = $5, is_active = $6
       WHERE id = $7`,
      [name, title, photo_url ?? "", bio ?? "", linkedin_url ?? "", is_active, id],
      { label: "Update executive" }
    );

    return { success: true };
  },
});
