import { queryClient } from "@superblocksteam/library";
import { pacificToDate } from "@/lib/preworkDeadline.js";

const PT = "America/Los_Angeles";

/** Today's date in Pacific time, "YYYY-MM-DD". */
export function todayPacific(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: PT });
}

/** "2026-11-13" → "Fri, Nov 13". */
export function formatPacificDay(date: string): string {
  const d = pacificToDate(`${date}T12:00`);
  return d ? d.toLocaleDateString("en-US", { timeZone: PT, weekday: "short", month: "short", day: "numeric" }) : date;
}

export type PreworkPreview = {
  onTime: boolean;
  itemPoints: number;
  earlyBird: number;
  finishesAll: boolean;
};

type PreviewInput = {
  date: string;
  selectedCount: number;
  /** completedAt of items that are already done (ISO). */
  existingCompletedAt: (string | null)[];
  openCount: number;
  deadline: string | null;
  pointsPerItem: number;
  earlyBird2Day: number;
  earlyBird1Day: number;
  earlyBirdGiven: boolean;
};

/**
 * What the server will award, by the same rules: items saved at noon PT on the chosen day,
 * +points each before the deadline, early bird based on when the last item was finished.
 */
export function previewPreworkPoints(p: PreviewInput): PreworkPreview {
  const at = pacificToDate(`${p.date}T12:00`);
  const atMs = Math.min(at?.getTime() ?? Date.now(), Date.now());
  const deadlineMs = p.deadline ? new Date(p.deadline).getTime() : null;
  const onTime = deadlineMs === null || atMs < deadlineMs;
  const itemPoints = onTime ? p.selectedCount * p.pointsPerItem : 0;
  const finishesAll = p.selectedCount > 0 && p.selectedCount === p.openCount;

  let earlyBird = 0;
  if (finishesAll && deadlineMs !== null && !p.earlyBirdGiven) {
    const last = Math.max(atMs, ...p.existingCompletedAt.map((c) => (c ? new Date(c).getTime() : 0)));
    const hrs = (deadlineMs - last) / 3_600_000;
    if (hrs >= 48) earlyBird = p.earlyBird2Day;
    else if (hrs >= 24) earlyBird = p.earlyBird1Day;
  }
  return { onTime, itemPoints, earlyBird, finishesAll };
}

const AFFECTED_APIS = [
  "GetCamperPreworkChecklist",
  "GetCamperReportCard",
  "GetCamperActivity",
  "GetAdminCampers",
  "GetPreworkStatus",
  "GetPreworkReminder",
  "GetLeaderboard",
  "GetPointLog",
];

/** Refetch every view that shows pre-work progress or points after a counselor check-off. */
export async function refreshPreworkViews(): Promise<void> {
  await Promise.all(AFFECTED_APIS.map((name) => queryClient.invalidateQueries(name)));
}
