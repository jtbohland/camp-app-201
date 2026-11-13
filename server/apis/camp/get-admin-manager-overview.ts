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
  /** Names of the cAMPers this manager has claimed (separator-joined in SQL, split below). */
  hire_names: z.string().nullable(),
});

const PoolRowSchema = z.object({
  name: z.string(),
  camper_id: z.coerce.number().nullable(),
  expected_manager: z.string().nullable(),
  claimed_by: z.string().nullable(),
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
  /** Every email we have on file for this manager (one person can appear under two). */
  emails: z.array(z.string()),
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
    managers: z.array(ManagerOverviewSchema.omit({ hire_names: true }).extend({ hires: z.array(z.string()) })),
    /** Every Accepted cAMPer in the cohort and who (if anyone) has claimed them. */
    camper_pool: z.array(PoolRowSchema),
    recent_comments: z.array(ManagerCommentDetailSchema),
    /** Managers of cAMPers marked Accepted in Cohort Management, and whether they've registered. */
    expected_managers: z.array(ExpectedManagerSchema),
    /** Accepted cAMPers with no manager email on file, so they can't be matched. */
    hires_without_manager: z.array(HireWithoutManagerSchema),
  }),
  async run(ctx) {
    await requireCounselor(ctx.integrations.camp_201_db, ctx.user.email);
    // Counselor/admin manager accounts are test logins: never listed, counted, or treated as a claim.
    const managers = await ctx.integrations.camp_201_db.query(
      `SELECT m.id, m.email, m.first_name, m.last_name, m.title, m.region,
              (SELECT COUNT(*) FROM camp201_manager_hires mh WHERE mh.manager_id = m.id)::integer as hire_count,
              (SELECT COUNT(*) FROM camp201_manager_comments mc WHERE mc.manager_id = m.id)::integer as comment_count,
              m.last_viewed_at::text,
              m.created_at::text,
              (SELECT string_agg(btrim(c.first_name || ' ' || c.last_name), '${SEP}' ORDER BY c.first_name, c.last_name)
               FROM camp201_manager_hires mh JOIN camp201_campers c ON c.id = mh.camper_id
               WHERE mh.manager_id = m.id) AS hire_names
       FROM camp201_managers m
       WHERE NOT camp201_is_admin_email(m.email)
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
       WHERE NOT camp201_is_admin_email(m.email)
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
             COALESCE(nh.camper_id, c.id) AS camper_id,
             lower(btrim(COALESCE(NULLIF(btrim(c.manager_email), ''), NULLIF(btrim(nh.manager_email), '')))) AS mgr_email,
             COALESCE(NULLIF(btrim(nh.manager_name), ''), NULLIF(btrim(c.manager), '')) AS mgr_name
      FROM camp201_new_hires nh
      LEFT JOIN LATERAL (
        SELECT x.id, x.manager_email, x.manager FROM camp201_campers x
        WHERE x.removed_at IS NULL AND (x.id = nh.camper_id OR lower(x.email) = lower(nh.email))
        ORDER BY (x.id = nh.camper_id) DESC, x.id DESC LIMIT 1
      ) c ON true
      WHERE nh.cohort_id = ${COHORT} AND nh.status = 'accepted'`;

    // One row per manager (not per email):
    //  1. Clean each email (spaces, "mailto:") and name (case, extra spaces).
    //  2. Match each email to a registered manager by email, else by a hire they've already
    //     linked when registering, else by name. Managers often
    //     register with a different alias than the one on the hire list (halle@ vs halle.morris@).
    //  3. Group by the registered manager, else by name, else by email, so a manager listed
    //     under two emails shows once with all their hires.
    // Registered = matched a registered manager, or every one of their hires is already linked
    // through manager registration.
    const expectedRows = await ctx.integrations.camp_201_db.query(
      `WITH hires AS (${HIRES_SQL}),
       norm AS (
         SELECT h.hire_name, h.mgr_name, h.camper_id,
                regexp_replace(regexp_replace(h.mgr_email, '^mailto:', ''), '[[:space:]]', '', 'g') AS mgr_email,
                NULLIF(lower(regexp_replace(btrim(COALESCE(h.mgr_name, '')), '[[:space:]]+', ' ', 'g')), '') AS name_key,
                EXISTS (SELECT 1 FROM camp201_manager_hires mh JOIN camp201_managers rm ON rm.id = mh.manager_id
                        WHERE mh.camper_id = h.camper_id AND NOT camp201_is_admin_email(rm.email)) AS linked
         FROM hires h
         WHERE COALESCE(h.mgr_email, '') <> ''
       ),
       by_email AS (
         SELECT mgr_email, max(mgr_name) AS mgr_name, max(name_key) AS name_key FROM norm GROUP BY mgr_email
       ),
       mgrs AS (
         SELECT m.id, lower(btrim(m.email)) AS email,
                lower(regexp_replace(btrim(COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, '')), '[[:space:]]+', ' ', 'g')) AS name_key
         FROM camp201_managers m
         WHERE NOT camp201_is_admin_email(m.email)
       ),
       keyed AS (
         SELECT e.*,
                COALESCE(
                  (SELECT m.id FROM mgrs m WHERE m.email = e.mgr_email ORDER BY m.id LIMIT 1),
                  (SELECT mh.manager_id FROM norm n2 JOIN camp201_manager_hires mh ON mh.camper_id = n2.camper_id
                   JOIN mgrs rm ON rm.id = mh.manager_id
                   WHERE n2.mgr_email = e.mgr_email ORDER BY mh.manager_id LIMIT 1),
                  (SELECT m.id FROM mgrs m WHERE e.name_key IS NOT NULL AND m.name_key = e.name_key ORDER BY m.id LIMIT 1)
                ) AS manager_id
         FROM by_email e
       ),
       grouped AS (
         SELECT k.*, COALESCE('m' || k.manager_id, 'n' || k.name_key, 'e' || k.mgr_email) AS gkey FROM keyed k
       )
       SELECT string_agg(DISTINCT g.mgr_email, '${SEP}' ORDER BY g.mgr_email) AS emails,
              max(g.mgr_name) AS name,
              string_agg(DISTINCT NULLIF(n.hire_name, ''), '${SEP}' ORDER BY NULLIF(n.hire_name, '')) AS hires,
              (bool_or(g.manager_id IS NOT NULL) OR bool_and(n.linked)) AS registered
       FROM grouped g
       JOIN norm n ON n.mgr_email = g.mgr_email
       GROUP BY g.gkey
       ORDER BY registered, max(g.mgr_name) NULLS LAST, min(g.mgr_email)
       LIMIT 300`,
      z.object({ emails: z.string(), name: z.string().nullable(), hires: z.string().nullable(), registered: z.boolean() }),
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

    // The pool: every Accepted cAMPer, with the (non-test) manager who claimed them, if any.
    const pool = await ctx.integrations.camp_201_db.query(
      `WITH hires AS (${HIRES_SQL})
       SELECT h.hire_name AS name, h.camper_id, h.mgr_name AS expected_manager,
              (SELECT string_agg(btrim(m.first_name || ' ' || m.last_name), ', ' ORDER BY m.id)
               FROM camp201_manager_hires mh JOIN camp201_managers m ON m.id = mh.manager_id
               WHERE mh.camper_id = h.camper_id AND NOT camp201_is_admin_email(m.email)) AS claimed_by
       FROM hires h
       WHERE h.hire_name <> ''
       ORDER BY h.hire_name
       LIMIT 300`,
      PoolRowSchema,
      undefined,
      { label: "Accepted cAMPers and who claimed them" }
    );

    return {
      managers: managers.map(({ hire_names, ...m }) => ({
        ...m,
        hires: (hire_names ?? "").split(SEP).filter(Boolean),
      })),
      camper_pool: pool,
      recent_comments: recentComments,
      expected_managers: expectedRows.map((r) => ({
        email: r.emails.split(SEP)[0] ?? "",
        emails: r.emails.split(SEP).filter(Boolean),
        name: r.name,
        registered: r.registered,
        hires: (r.hires ?? "").split(SEP).filter(Boolean),
      })),
      hires_without_manager: noManager,
    };
  },
});
