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
  /** The agenda session the speaker appears in, and that session's day + start time. */
  agenda_item_id: number | null;
  session_title: string | null;
  day_number: number | null;
  start_time: string | null;
  /** Counselors only: the speaker's day is still locked for cAMPers. */
  day_locked: boolean;
};

export const SPEAKER_DAY_LABELS: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };

/** "13:30:00" → "1:30 PM" */
export function formatSessionTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export type SpeakerDayGroup = { dayNumber: number | null; label: string; locked: boolean; speakers: Executive[] };

/** Groups speakers by their session's day (in day order). Speakers with no session go last. */
export function groupSpeakersByDay(executives: Executive[]): SpeakerDayGroup[] {
  const byDay = new Map<number | null, Executive[]>();
  for (const e of executives) {
    const key = e.day_number ?? null;
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
    .map(([dayNumber, speakers]) => ({
      dayNumber,
      label: dayNumber === null ? "No session assigned" : `Day ${dayNumber} · ${SPEAKER_DAY_LABELS[dayNumber] ?? ""}`,
      locked: speakers.some((s) => s.day_locked),
      speakers,
    }));
}

/** What's still missing before this speaker is set up (counselors only). */
export function getSpeakerMissing(e: Executive): string[] {
  const missing: string[] = [];
  if (!e.email) missing.push("email");
  if (!e.slack_name) missing.push("Slack name");
  if (!e.agenda_item_id) missing.push("session");
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
