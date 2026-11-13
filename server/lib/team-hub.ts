import { z } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "./cohort.js";

/** Item types a post can have. "task" is a to-do with an optional assignee. */
export const HUB_ITEM_TYPES = ["note", "idea", "resource", "doc", "task"] as const;
export type HubItemType = (typeof HUB_ITEM_TYPES)[number];

/** Section key for the general Team Board tab. Presentation tabs use `pres_{id}`. */
export const BOARD_SECTION = "board";

export type HubViewer = {
  /** The signed-in user's camper row id, or null (e.g. a guest judge with no profile). */
  camperId: number | null;
  isCounselor: boolean;
  isMember: boolean;
  /** Members and counselors (with a camper profile) can post. */
  canContribute: boolean;
};

/** Who is looking at this team's hub, resolved from the signed-in email (never from the browser). */
export async function resolveHubViewer(db: any, email: string | null | undefined, teamId: number): Promise<HubViewer> {
  const normalized = (email ?? "").toLowerCase().trim();
  if (!normalized) throw new Error("You must be signed in.");
  const [access, rows] = await Promise.all([
    getCounselorAccess(db, normalized),
    db.query(
      `SELECT id, team_id FROM camp201_campers WHERE lower(email) = $1 ORDER BY id DESC LIMIT 1`,
      z.object({ id: z.coerce.number(), team_id: z.coerce.number().nullable() }),
      [normalized],
      { label: "Find signed-in camper" }
    ),
  ]);
  const camperId = rows[0]?.id ?? null;
  const isMember = rows[0]?.team_id === teamId;
  const isCounselor = access.isAdmin;
  return { camperId, isCounselor, isMember, canContribute: camperId !== null && (isMember || isCounselor) };
}

/** Throws unless the viewer can see this team's hub. */
export function assertCanView(viewer: HubViewer): void {
  if (!viewer.isMember && !viewer.isCounselor) {
    throw new Error("This hub is only open to the team and counselors.");
  }
}

/** Throws unless the viewer can post or change items in this hub. Returns their camper id. */
export function assertCanContribute(viewer: HubViewer): number {
  assertCanView(viewer);
  if (viewer.camperId === null) throw new Error("You need a cAMP profile to post in a Team Hub.");
  return viewer.camperId;
}

/** Valid section keys: the Team Board or a presentation tab. */
export function isValidSection(section: string): boolean {
  return section === BOARD_SECTION || /^pres_\d+$/.test(section);
}

/** Only http(s) links are stored, so a post can't carry a javascript: URL. */
export function cleanLink(url: string | null | undefined): string | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return null;
  // Add https:// when missing; anything with another scheme (javascript:, data:, …) is rejected.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("Links must start with http:// or https://.");
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  // host (letters, digits, dots, dashes; optional port) then an optional path — no spaces.
  if (!/^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?(\/\S*)?$/i.test(withScheme)) {
    throw new Error("That link doesn't look like a valid URL.");
  }
  return withScheme;
}

/** Throws unless `assigneeId` is on this team. Null clears the assignee. */
export async function assertAssigneeOnTeam(db: any, assigneeId: number | null, teamId: number): Promise<void> {
  if (assigneeId === null) return;
  const rows = await db.query(
    `SELECT 1 AS ok FROM camp201_campers WHERE id = $1 AND team_id = $2 LIMIT 1`,
    z.object({ ok: z.coerce.number() }),
    [assigneeId, teamId],
    { label: "Check assignee is on the team" }
  );
  if (rows.length === 0) throw new Error("You can only assign to-dos to people on this team.");
}
