import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL, isCounselorSql } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CandidateSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  email: z.string(),
  photo_url: z.string().nullable(),
});

type Db = {
  query: <T extends z.ZodTypeAny>(sql: string, schema: T, params?: unknown[], meta?: { label?: string }) => Promise<z.infer<T>[]>;
};

/** The signed-in manager's id. Uses the server-verified email, never a value sent from the browser. */
async function requireManagerId(db: Db, email: string | null | undefined): Promise<number> {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) throw new Error("You must be signed in.");
  const rows = await db.query(
    `SELECT id FROM camp201_managers WHERE lower(email) = $1 LIMIT 1`,
    z.object({ id: z.coerce.number() }),
    [normalized],
    { label: "Find signed-in manager" }
  );
  if (rows.length === 0) throw new Error("Register in the Manager Portal first.");
  return rows[0].id;
}

// Active-cohort cAMPers (no counselors) who aren't on this manager's dashboard yet.
const NOT_YET_ADDED = `
  c.cohort_id = ${ACTIVE_COHORT_ID_SQL}
  AND NOT ${isCounselorSql("c")}
  AND NOT EXISTS (
    SELECT 1 FROM camp201_manager_hires mh
    WHERE mh.manager_id = $1 AND mh.camper_id = c.id
  )`;

export const GetSuggestedHires = api({
  name: "GetSuggestedHires",
  description: "cAMPers who listed the signed-in manager's email",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    suggestions: z.array(CandidateSchema),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const managerId = await requireManagerId(db, ctx.user.email);
    const suggestions = await db.query(
      `SELECT c.id, c.first_name, c.last_name, c.role, c.email, c.photo_url
       FROM camp201_campers c
       WHERE lower(c.manager_email) = $2 AND ${NOT_YET_ADDED}
       ORDER BY c.created_at DESC
       LIMIT 20`,
      CandidateSchema,
      [managerId, (ctx.user.email ?? "").trim().toLowerCase()],
      { label: "cAMPers who listed this manager" }
    );
    return { suggestions };
  },
});

export const GetAddableHires = api({
  name: "GetAddableHires",
  description: "Searches this cohort's cAMPers a manager can add",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    search: z.string().max(100).nullable(),
  }),
  output: z.object({
    campers: z.array(CandidateSchema),
  }),
  async run(ctx, { search }) {
    const db = ctx.integrations.camp_201_db;
    const managerId = await requireManagerId(db, ctx.user.email);
    const term = (search ?? "").trim();
    const campers = await db.query(
      `SELECT c.id, c.first_name, c.last_name, c.role, c.email, c.photo_url
       FROM camp201_campers c
       WHERE ${NOT_YET_ADDED}
         AND ($2 = '' OR (c.first_name || ' ' || c.last_name) ILIKE '%' || $2 || '%' OR c.email ILIKE '%' || $2 || '%')
       ORDER BY c.first_name, c.last_name
       LIMIT 25`,
      CandidateSchema,
      [managerId, term],
      { label: "Search addable cAMPers" }
    );
    return { campers };
  },
});

export const AddHireToManager = api({
  name: "AddHireToManager",
  description: "Adds a cAMPer to the signed-in manager's dashboard",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number().int().positive(),
  }),
  output: z.object({
    added: z.boolean(),
  }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    const managerId = await requireManagerId(db, ctx.user.email);

    // Only active-cohort cAMPers who aren't counselors can be added.
    const eligible = await db.query(
      `SELECT c.id FROM camp201_campers c
       WHERE c.id = $1 AND c.cohort_id = ${ACTIVE_COHORT_ID_SQL} AND NOT ${isCounselorSql("c")}
       LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [camper_id],
      { label: "Check cAMPer can be added" }
    );
    if (eligible.length === 0) throw new Error("That cAMPer can't be added.");

    const inserted = await db.query(
      `WITH ins AS (
         INSERT INTO camp201_manager_hires (manager_id, camper_id)
         VALUES ($1, $2)
         ON CONFLICT (manager_id, camper_id) DO NOTHING
         RETURNING camper_id
       )
       SELECT camper_id FROM ins LIMIT 1`,
      z.object({ camper_id: z.coerce.number() }),
      [managerId, camper_id],
      { label: "Link cAMPer to manager" }
    );
    return { added: inserted.length > 0 };
  },
});
