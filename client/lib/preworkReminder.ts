/**
 * Pre-work reminder timing. The modal shows at most once per day (the first open or refresh
 * that day), plus right after registration and right after a cAMPer's first profile save.
 */

const SHOWN_KEY = "camp201.preworkReminder.shown";
const FORCE_KEY = "camp201.preworkReminder.force";
export const PREWORK_REMINDER_EVENT = "camp201:prework-reminder";

/** Local calendar day, e.g. "2026-11-13". */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const shownKey = (email: string) => `${SHOWN_KEY}:${email.trim().toLowerCase()}`;

export function wasShownToday(email: string): boolean {
  try {
    return window.localStorage.getItem(shownKey(email)) === today();
  } catch {
    return false;
  }
}

export function markShownToday(email: string): void {
  try {
    window.localStorage.setItem(shownKey(email), today());
  } catch {
    /* storage blocked: worst case it shows again on the next refresh */
  }
}

/** Ask for the reminder now, even if it already showed today (after registration / first profile save). */
export function requestPreworkReminder(): void {
  try {
    window.sessionStorage.setItem(FORCE_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREWORK_REMINDER_EVENT));
}

export function isReminderRequested(): boolean {
  try {
    return window.sessionStorage.getItem(FORCE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearReminderRequest(): void {
  try {
    window.sessionStorage.removeItem(FORCE_KEY);
  } catch {
    /* ignore */
  }
}
