import { SPEAKER_DAY_LABELS } from "@/lib/speakers.js";

export type AgendaResource = {
  id: number;
  title: string;
  url: string;
  session_bank_id: number;
  agenda_item_id: number;
  session_title: string;
  session_type: string;
  day_number: number;
  start_time: string;
  day_locked: boolean;
};

/** One scheduled session with its links. */
export type SessionResourceGroup = {
  agendaItemId: number;
  sessionTitle: string;
  sessionType: string;
  startTime: string;
  links: { id: number; title: string; url: string }[];
};

export type ResourceDayGroup = {
  dayNumber: number;
  label: string;
  locked: boolean;
  sessions: SessionResourceGroup[];
};

export function formatClock(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

/** Links per scheduled tile, so the agenda can show a pill on each one. */
export function linksByAgendaItem(resources: AgendaResource[]): Map<number, { id: number; title: string; url: string }[]> {
  const m = new Map<number, { id: number; title: string; url: string }[]>();
  for (const r of resources) {
    const list = m.get(r.agenda_item_id) ?? [];
    list.push({ id: r.id, title: r.title, url: r.url });
    m.set(r.agenda_item_id, list);
  }
  return m;
}

/** Day → session → links, in agenda order (rows already arrive sorted from the API). */
export function groupResourcesByDay(resources: AgendaResource[]): ResourceDayGroup[] {
  const days = new Map<number, ResourceDayGroup>();
  for (const r of resources) {
    let day = days.get(r.day_number);
    if (!day) {
      day = {
        dayNumber: r.day_number,
        label: `Day ${r.day_number} · ${SPEAKER_DAY_LABELS[r.day_number] ?? ""}`,
        locked: r.day_locked,
        sessions: [],
      };
      days.set(r.day_number, day);
    }
    let session = day.sessions.find((s) => s.agendaItemId === r.agenda_item_id);
    if (!session) {
      session = { agendaItemId: r.agenda_item_id, sessionTitle: r.session_title, sessionType: r.session_type, startTime: r.start_time, links: [] };
      day.sessions.push(session);
    }
    session.links.push({ id: r.id, title: r.title, url: r.url });
  }
  return [...days.values()].sort((a, b) => a.dayNumber - b.dayNumber);
}

/** Which cAMP day it is in Pacific time (1-based), or null before cAMP starts / without a start date. */
export function campDayNumber(campStartDate: string | null | undefined, now = new Date()): number | null {
  if (!campStartDate) return null;
  const nowPT = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const start = new Date(campStartDate + "T00:00:00");
  const diffDays = Math.floor((nowPT.getTime() - start.getTime()) / 86_400_000);
  return diffDays >= 0 ? diffDays + 1 : null;
}

export function linkIcon(url: string): "presentation" | "file-text" | "sheet" | "video" | "link" {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/presentation") || u.includes("slides") || u.includes(".ppt") || u.includes("pitch.com")) return "presentation";
  if (u.includes("docs.google.com/spreadsheets")) return "sheet";
  if (u.includes("loom.com") || u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com")) return "video";
  if (u.includes("docs.google.com/document") || u.includes(".pdf") || u.includes("notion")) return "file-text";
  return "link";
}
