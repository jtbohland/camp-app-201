import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, requireCounselor, resolveViewCohort } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ManagerOverviewSchema = z.object({
  id: z.coerce.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  title: z.string(),
  region: z.string(),
  hire_count: z.coerce.number(),
  comment_count: z.coerce.number(),
  last_viewed_at: z.string().nullable(),
  created_at: z.string(),
});

const ManagerCommentDetailSchema = z.object({
  id: z.coerce.number(),
  manager_first_name: z.string(),
  manager_last_name: z.string(),
  camper_first_name: z.string(),
  camper_last_name: z.string(),
  comment_type: z.string(),
  sentiment: z.string(),
  content: z.string(),
  visibility: z.string(),
  created_at: z.string(),
});

const ExpectedManagerSchema = z.object({
  email: z.string(),
  name: z.string().nullable(),
  hires: z.array(z.string()),
  registered: z.boolean(),
});

const HireWithoutManagerSchema = z.object({
  name: z.string(),
  manager_name: z.string().nullable(),
});

/** Separator for hire names inside one aggregated string (never appears in a name). */
const SEP = "\u001f";

export default api({
  name: "GetAdminManagerOverview",
  description: "Gets all managers with their hires, comments, and activity for admin view",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    managers: z.array(ManagerOverviewSchema),
    recent_comments: z.array(ManagerCommentDetailSchema),
    /** Managers of cAMPers marked Accepted in Cohort Management, and whether they've registered. */
    expected_managers: z.array(ExpectedManagerSchema),
    /** Accepted cAMPers with no manager email on file, so they can't be matched. */
    hires_without_manager: z.array(HireWithoutManagerSchema),
  }),
  async run(ctx) {
    await requireCounselor(ctx.integrations.camp_201_db, ctx.user.email);
    const managers = await ctx.integrations.camp_201_db.query(
      `SELECT m.id, m.email, m.first_name, m.last_name, m.title, m.region,
              (SELECT COUNT(*) FROM camp201_manager_hires mh WHERE mh.manager_id = m.id)::integer as hire_count,
              (SELECT COUNT(*) FROM camp201_manager_comments mc WHERE mc.manager_id = m.id)::integer as comment_count,
              m.last_viewed_at::text,
              m.created_at::text
       FROM camp201_managers m
       ORDER BY m.created_at DESC
       LIMIT 100`,
      ManagerOverviewSchema,
      undefined,
      { label: "Get all managers overview" }
    );

    const recentComments = await ctx.integrations.camp_201_db.query(
      `SELECT mc.id,
              m.first_name as manager_first_name, m.last_name as manager_last_name,
              c.first_name as camper_first_name, c.last_name as camper_last_name,
              mc.comment_type, mc.sentiment, mc.content, mc.visibility, mc.created_at::text
       FROM camp201_manager_comments mc
       JOIN camp201_managers m ON m.id = mc.manager_id
       JOIN camp201_campers c ON c.id = mc.camper_id
       ORDER BY mc.created_at DESC
       LIMIT 50`,
      ManagerCommentDetailSchema,
      undefined,
      { label: "Get recent manager comments" }
    );

    // Expected managers: everyone managing an Accepted cAMPer in the cohort being viewed.
    // Manager email comes from the cAMPer's own profile first, then the Cohort Management upload.
    const view = await resolveViewCohort(ctx.integrations.camp_201_db, ctx.user.email);
    const COHORT = cohortIdSql(view.cohortId);
    const HIRES_SQL = `
      SELECT btrim(COALESCE(nh.first_name, '') || ' ' || COALESCE(nh.last_name, '')) AS hire_name,
             lower(btrim(COALESCE(NULLIF(btrim(c.manager_email), ''), NULLIF(btrim(nh.manager_email), '')))) AS mgr_email,
             COALESCE(NULLIF(btrim(nh.manager_name), ''), NULLIF(btrim(c.manager), '')) AS mgr_name
      FROM camp201_new_hires nh
      LEFT JOIN LATERAL (
        SELECT x.manager_email, x.manager FROM camp201_campers x
        WHERE x.removed_at IS NULL AND (x.id = nh.camper_id OR lower(x.email) = lower(nh.email))
        ORDER BY (x.id = nh.camper_id) DESC, x.id DESC LIMIT 1
      ) c ON true
      WHERE nh.cohort_id = ${COHORT} AND nh.status = 'accepted'`;

    const expectedRows = await ctx.integrations.camp_201_db.query(
      `WITH hires AS (${HIRES_SQL})
       SELECT h.mgr_email AS email,
              max(h.mgr_name) AS name,
              string_agg(NULLIF(h.hire_name, ''), '${SEP}' ORDER BY h.hire_name) AS hires,
              EXISTS (SELECT 1 FROM camp201_managers m WHERE lower(btrim(m.email)) = h.mgr_email) AS registered
       FROM hires h
       WHERE h.mgr_email IS NOT NULL AND h.mgr_email <> ''
       GROUP BY h.mgr_email
       ORDER BY registered, max(h.mgr_name) NULLS LAST, h.mgr_email
       LIMIT 300`,
      z.object({ email: z.string(), name: z.string().nullable(), hires: z.string().nullable(), registered: z.boolean() }),
      undefined,
      { label: "Find expected managers from accepted cAMPers" }
    );

    const noManager = await ctx.integrations.camp_201_db.query(
      `WITH hires AS (${HIRES_SQL})
       SELECT h.hire_name AS name, h.mgr_name AS manager_name
       FROM hires h
       WHERE h.mgr_email IS NULL OR h.mgr_email = ''
       ORDER BY h.hire_name
       LIMIT 300`,
      HireWithoutManagerSchema,
      undefined,
      { label: "Find accepted cAMPers with no manager email" }
    );

    return {
      managers,
      recent_comments: recentComments,
      expected_managers: expectedRows.map((r) => ({
        email: r.email,
        name: r.name,
        registered: r.registered,
        hires: (r.hires ?? "").split(SEP).filter(Boolean),
      })),
      hires_without_manager: noManager,
    };
  },
});
