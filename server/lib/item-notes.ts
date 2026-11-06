import { z } from "@superblocksteam/sdk-api";

/**
 * Manager reactions/notes attached to one activity-timeline item (camp201_manager_comments.target_key).
 * Counselors see every item note; a manager sees only their own (onlyMine).
 */
export const ItemNoteSchema = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  target_key: z.string(),
  comment_type: z.string(),
  content: z.string(),
  visibility: z.string(),
  manager_name: z.string(),
  mine: z.boolean(),
  created_at: z.string(),
});
export type ItemNote = z.infer<typeof ItemNoteSchema>;

/** `key` like 'survey:68'. Only lowercase kinds and digits, so it is safe to store and compare. */
export const TargetKeySchema = z.string().regex(/^[a-z_]{2,20}:\d{1,12}$/, "Invalid activity item");

export async function loadItemNotes(
  db: any,
  camperIds: number[],
  viewerEmail: string | null | undefined,
  onlyMine: boolean,
): Promise<ItemNote[]> {
  if (camperIds.length === 0) return [];
  const email = (viewerEmail ?? "").trim().toLowerCase();
  return db.query(
    `SELECT mc.id, mc.camper_id, mc.target_key, mc.comment_type, mc.content, mc.visibility,
            m.first_name AS manager_name, (lower(m.email) = $2) AS mine, mc.created_at::text
     FROM camp201_manager_comments mc
     JOIN camp201_managers m ON m.id = mc.manager_id
     WHERE mc.camper_id = ANY($1::int[]) AND mc.target_key IS NOT NULL
       AND ($3::boolean = false OR lower(m.email) = $2)
     ORDER BY mc.created_at ASC
     LIMIT 1000`,
    ItemNoteSchema,
    [camperIds, email, onlyMine],
    { label: "Load item reactions/notes" }
  );
}
