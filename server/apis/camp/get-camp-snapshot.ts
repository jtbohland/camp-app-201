import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor, resolveViewCohort } from "../../lib/cohort.js";
import { getStandings } from "../../lib/cohort-snapshot.js";
import { denseRanks } from "../../lib/rank.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const BadgeRow = z.object({
  camper_id: z.coerce.number(),
  badge_id: z.coerce.number(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  earn_count: z.coerce.number(),
});

const CamperExtraRow = z.object({
  id: z.coerce.number(),
  role: z.string().nullable(),
  region: z.string().nullable(),
});

/**
 * Counselor-only, full-camp view for the Graduation tab: every cAMPer ranked with points,
 * team and badges, plus every team with its members. Counselors aren't ranked themselves.
 */
export default api({
  name: "GetCampSnapshot",
  description: "Full-camp rankings, badges and teams for counselors",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    campers: z.array(
      z.object({
        id: z.number(),
        rank: z.number(),
        name: z.string(),
        photo_url: z.string().nullable(),
        role: z.string().nullable(),
        region: z.string().nullable(),
        points: z.number(),
        team_id: z.number().nullable(),
        team_name: z.string().nullable(),
        team_color: z.string().nullable(),
        badges: z.array(z.object({ id: z.number(), name: z.string(), icon: z.string(), color: z.string(), count: z.number() })),
      })
    ),
    teams: z.array(
      z.object({
        id: z.number(),
        rank: z.number(),
        name: z.string(),
        logo_url: z.string().nullable(),
        color: z.string().nullable(),
        total_points: z.number(),
        member_ids: z.array(z.number()),
      })
    ),
    total_points: z.number(),
    total_badges: z.number(),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const view = await resolveViewCohort(db, ctx.user.email);
    const { campers, teams } = await getStandings(db, view);
    if (campers.length === 0) return { campers: [], teams: [], total_points: 0, total_badges: 0 };

    const ids = campers.map((c) => c.id);
    const [badges, extras] = await Promise.all([
      db.query(
        `SELECT cb.camper_id, cb.badge_id, b.name, b.icon, b.color, COALESCE(cb.earn_count, 1) AS earn_count
         FROM camp201_camper_badges cb
         JOIN camp201_badges b ON b.id = cb.badge_id
         WHERE cb.camper_id = ANY($1::int[])
         ORDER BY b.name
         LIMIT 5000`,
        BadgeRow,
        [ids],
        { label: "Badges for every cAMPer" }
      ),
      db.query(
        `SELECT id, role, region FROM camp201_campers WHERE id = ANY($1::int[]) LIMIT 500`,
        CamperExtraRow,
        [ids],
        { label: "Roles and regions" }
      ),
    ]);

    const badgesBy = new Map<number, { id: number; name: string; icon: string; color: string; count: number }[]>();
    for (const b of badges) {
      const list = badgesBy.get(b.camper_id) ?? [];
      list.push({ id: b.badge_id, name: b.name, icon: b.icon || "award", color: b.color || "amber", count: b.earn_count });
      badgesBy.set(b.camper_id, list);
    }
    const extraBy = new Map(extras.map((e) => [e.id, e]));
    const teamBy = new Map(teams.map((t) => [t.id, t]));

    // Ties share a place and the next group is the next number (8, 8, 8, 9).
    const camperPlaces = denseRanks(campers.map((c) => c.points));
    const teamPlaces = denseRanks(teams.map((t) => t.total_points));
    const ranked = campers.map((c, i) => {
      const team = c.team_id !== null ? teamBy.get(c.team_id) : undefined;
      return {
        id: c.id,
        rank: camperPlaces[i],
        name: `${c.first_name} ${c.last_name}`.trim(),
        photo_url: c.photo_url,
        role: extraBy.get(c.id)?.role ?? null,
        region: extraBy.get(c.id)?.region ?? null,
        points: c.points,
        team_id: c.team_id,
        team_name: team?.name ?? null,
        team_color: team?.color ?? null,
        badges: badgesBy.get(c.id) ?? [],
      };
    });

    return {
      campers: ranked,
      teams: teams.map((t, i) => ({
        id: t.id,
        rank: teamPlaces[i],
        name: t.name,
        logo_url: t.logo_url,
        color: t.color,
        total_points: t.total_points,
        member_ids: campers.filter((c) => c.team_id === t.id).map((c) => c.id),
      })),
      total_points: campers.reduce((s, c) => s + c.points, 0),
      total_badges: badges.reduce((s, b) => s + b.earn_count, 0),
    };
  },
});
