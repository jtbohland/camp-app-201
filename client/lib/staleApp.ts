import { toast } from "sonner";

/**
 * A browser tab left open across a deploy keeps running the old copy of the app. Its API calls
 * then fail with "NotFoundError" because the server no longer has that version. Reloading picks
 * up the current version, so we do it automatically instead of asking cAMPers to refresh.
 */

const RELOAD_KEY = "camp201-stale-reload-at";
/** If we already reloaded this recently and still see the error, stop and show it instead. */
const LOOP_GUARD_MS = 2 * 60 * 1000;

let reloading = false;

export function isStaleAppError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "string") return /not\s?found\s?error/i.test(err);
  if (typeof err !== "object") return false;
  const e = err as { name?: unknown; message?: unknown; code?: unknown; status?: unknown };
  const text = [e.name, e.message, e.code].filter((v) => typeof v === "string").join(" ");
  return /not\s?found\s?error/i.test(text) || e.status === 404 || e.code === 404;
}

/** Reloads the page to load the latest version. Returns false if we just did (avoids loops). */
export function reloadForNewVersion(): boolean {
  if (reloading) return true;
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  } catch {
    // Storage unavailable (private mode): still reload, just without the loop guard.
  }
  if (Date.now() - last < LOOP_GUARD_MS) return false;
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  reloading = true;
  toast.info("cAMP 201 was just updated. Loading the latest version…", { duration: 4000 });
  setTimeout(() => window.location.reload(), 1200);
  return true;
}

/** If this error means the tab is out of date, start a reload and return true. */
export function handleStaleAppError(err: unknown): boolean {
  return isStaleAppError(err) && reloadForNewVersion();
}

/** A promise that never settles: the page is about to reload, so callers shouldn't show errors. */
export function pendingReload<T>(): Promise<T> {
  return new Promise<T>(() => {});
}
