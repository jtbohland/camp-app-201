/** A guest speaker from the GetExecutives API. */
export type Executive = {
  id: number;
  name: string;
  title: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  is_active: boolean;
  email: string | null;
  slack_name: string | null;
  /** Counselors only: when the share link was first copied. */
  link_copied_at: string | null;
};

/** What's still missing before this speaker is set up (counselors only). */
export function getSpeakerMissing(e: Executive): string[] {
  const missing: string[] = [];
  if (!e.email) missing.push("email");
  if (!e.slack_name) missing.push("Slack name");
  if (!e.link_copied_at) missing.push("share link not copied");
  return missing;
}

export function isSpeakerIncomplete(e: Executive): boolean {
  return getSpeakerMissing(e).length > 0;
}

/**
 * Link the speaker opens. Uses this app's current address, so it points at the deployed app
 * when copied from the deployed app. Opening /agenda?speaker=ID lands them on their Q&A.
 */
export function getSpeakerShareLink(executiveId: number): string {
  const { origin, pathname } = window.location;
  // Keep any app prefix (e.g. /code-mode/applications/<id>) and swap the page path for /agenda.
  const base = pathname.replace(/\/(agenda|teams|admin|leaderboard|profile|journey|presentations|timer|wheel|surveys|badges|graduation|manager)(\/.*)?$/, "");
  return `${origin}${base.replace(/\/$/, "")}/agenda?tab=speakers&speaker=${executiveId}`;
}

/** Slack message a counselor can paste to the speaker along with the link. */
export function getSpeakerInviteMessage(e: Executive): string {
  const first = e.name.split(" ")[0] || e.name;
  return `Hi ${first}! Thanks for speaking at cAMP 201 🏕️ Here's your link to the cAMP app, where you can see the cohort, agenda, and your live Q&A (you can reply to questions there, even after the session): ${getSpeakerShareLink(e.id)}`;
}
