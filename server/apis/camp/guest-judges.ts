import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, getActiveCohortId, getCounselorAccess } from "../../lib/cohort.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Only full counselors manage guest judges (a guest judge can't add more judges). */
async function requireFullCounselor(db: any, email: string | undefined): Promise<void> {
  const access = await getCounselorAccess(db, email);
  if (!access.isAdmin || access.isGuestJudge) throw new Error("Only counselors can manage guest judges.");
}

const GuestJudgeSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  email: z.string(),
  created_at: z.string(),
});

export const GetGuestJudges = api({
  name: "GetGuestJudges",
  description: "Lists guest judges for the active cohort",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ judges: z.array(GuestJudgeSchema) }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const access = await getCounselorAccess(db, ctx.user.email);
    if (!access.isAdmin) return { judges: [] };
    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) return { judges: [] };
    const judges = await db.query(
      `SELECT id, name, email, created_at::text
       FROM camp201_guest_judges
       WHERE cohort_id = $1 AND revoked_at IS NULL
       ORDER BY created_at LIMIT 50`,
      GuestJudgeSchema,
      [cohortId],
      { label: "List guest judges" }
    );
    return { judges };
  },
});

export const AddGuestJudge = api({
  name: "AddGuestJudge",
  description: "Gives a guest judge counselor access for this cohort",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireFullCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    if (await isCampClosed(db)) throw new Error("cAMP is closed, so guest judges can't be added.");
    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("There's no active cohort.");

    const email = input.email.toLowerCase();
    const existing = await db.query(
      `SELECT
         (EXISTS (SELECT 1 FROM camp201_admins WHERE lower(email) = $1)
          OR EXISTS (SELECT 1 FROM camp201_campers WHERE lower(email) = $1 AND role IN ('counselor', 'admin'))) AS is_counselor,
         EXISTS (SELECT 1 FROM camp201_campers WHERE lower(email) = $1 AND removed_at IS NULL
                   AND role NOT IN ('counselor', 'admin')) AS is_camper`,
      z.object({ is_counselor: z.boolean().nullable(), is_camper: z.boolean().nullable() }),
      [email],
      { label: "Check judge email" }
    );
    if (existing[0]?.is_counselor) throw new Error("That person is already a counselor, so they can score already.");
    if (existing[0]?.is_camper) throw new Error("That email belongs to a registered cAMPer, who can't be a judge.");

    await db.execute(
      `INSERT INTO camp201_guest_judges (email, name, cohort_id, added_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lower(email), cohort_id)
       DO UPDATE SET name = EXCLUDED.name, revoked_at = NULL, added_by = EXCLUDED.added_by`,
      [email, input.name, cohortId, (ctx.user.email ?? "").toLowerCase()],
      { label: "Add guest judge" }
    );
    return { success: true };
  },
});

export const RemoveGuestJudge = api({
  name: "RemoveGuestJudge",
  description: "Ends a guest judge's access early",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ id: z.number().int() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { id }) {
    const db = ctx.integrations.camp_201_db;
    await requireFullCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    // Their submitted scores stay; only their access ends.
    await db.execute(
      `UPDATE camp201_guest_judges SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
      [id],
      { label: "Remove guest judge access" }
    );
    return { success: true };
  },
});
