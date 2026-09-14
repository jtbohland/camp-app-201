import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const MemorySchema = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  memory_type: z.string(),
  content: z.string().nullable(),
  image_url: z.string().nullable(),
  day_number: z.coerce.number().nullable(),
  created_at: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  photo_url: z.string().nullable(),
  reactions: z.string().nullable(),
});

export default api({
  name: "GetMemories",
  description: "Fetches memories feed with reactions for the active cohort",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    day_filter: z.number().nullable(),
    viewer_camper_id: z.number().nullable(),
  }),
  output: z.object({
    memories: z.array(z.object({
      id: z.number(),
      camper_id: z.number(),
      memory_type: z.string(),
      content: z.string().nullable(),
      image_url: z.string().nullable(),
      day_number: z.number().nullable(),
      created_at: z.string(),
      author_name: z.string(),
      author_photo: z.string().nullable(),
      reactions: z.array(z.object({
        emoji: z.string(),
        count: z.number(),
        reacted: z.boolean(),
      })),
    })),
  }),
  async run(ctx, { day_filter, viewer_camper_id }) {
    const dayClause = day_filter ? `AND combined.day_number = ${day_filter}` : "";

    // UNION camp201_memories with legacy camp201_gallery into one feed
    const rows = await ctx.integrations.apps_database.query(
      `WITH combined AS (
        SELECT m.id, m.camper_id, m.memory_type, m.content, m.image_url, m.day_number, m.created_at
        FROM camp201_memories m
        UNION ALL
        SELECT -(g.id) as id, g.uploaded_by as camper_id, 'photo' as memory_type, g.caption as content,
               g.image_url, g.day_number, g.created_at
        FROM camp201_gallery g
      )
      SELECT combined.id, combined.camper_id, combined.memory_type, combined.content, combined.image_url,
             combined.day_number, combined.created_at::text, c.first_name, c.last_name, c.photo_url,
             CASE WHEN combined.id > 0 THEN
               (SELECT json_agg(json_build_object('emoji', sub.emoji, 'count', sub.cnt,
                 'reacted', COALESCE((SELECT true FROM camp201_memory_reactions r2
                   WHERE r2.memory_id = combined.id AND r2.emoji = sub.emoji AND r2.camper_id = ${viewer_camper_id ?? 0}), false)))
                FROM (SELECT emoji, COUNT(*) as cnt FROM camp201_memory_reactions WHERE memory_id = combined.id GROUP BY emoji) sub
               )::text
             ELSE NULL END as reactions
      FROM combined
      JOIN camp201_campers c ON c.id = combined.camper_id
      WHERE 1=1 ${dayClause}
      ORDER BY combined.created_at DESC
      LIMIT 50`,
      MemorySchema,
      undefined,
      { label: "Fetch unified memories + gallery feed" }
    );

    const EMOJI_LIST = ["❤️", "🙌", "🥹", "😂", "🔥"];

    return {
      memories: rows.map((r) => {
        let parsedReactions: { emoji: string; count: number; reacted: boolean }[] = [];
        try {
          parsedReactions = r.reactions ? JSON.parse(r.reactions) : [];
        } catch {}

        // Fill in missing emojis with count 0
        const reactionMap = new Map(parsedReactions.map((rx) => [rx.emoji, rx]));
        const allReactions = EMOJI_LIST.map((e) => reactionMap.get(e) ?? { emoji: e, count: 0, reacted: false });

        return {
          id: r.id,
          camper_id: r.camper_id,
          memory_type: r.memory_type,
          content: r.content,
          image_url: r.image_url,
          day_number: r.day_number,
          created_at: r.created_at,
          author_name: `${r.first_name} ${r.last_name}`,
          author_photo: r.photo_url,
          reactions: allReactions,
        };
      }),
    };
  },
});
