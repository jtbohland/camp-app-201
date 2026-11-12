import { executeApi } from "@/lib/executeApi.js";
import { READ_ONLY_MESSAGE } from "@/lib/readOnlyGuard";

/**
 * Pre-work submits must never leave a cAMPer thinking they failed when the save landed,
 * or losing a save to a one-off network/platform blip.
 *
 * If the call throws, we (1) check the server to see whether the item is now complete,
 * and (2) if not, retry once. Only if both fail do we surface an error.
 */

export type SubmitOutcome<T> =
  | { kind: "ok"; result: T }
  | { kind: "recovered" }; // call threw, but the server shows the item complete

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isReadOnlyError(err: unknown): boolean {
  return !!err && typeof err === "object" && "message" in err && (err as { message: unknown }).message === READ_ONLY_MESSAGE;
}

/** True if the server already has this pre-work item marked complete for the cAMPer. */
export async function isPreworkItemComplete(camperId: number, itemKey: string): Promise<boolean> {
  try {
    const status = await executeApi("GetPreworkStatus", { user_id: camperId });
    return (status?.completedItems ?? []).some((i: { item: string }) => i.item === itemKey);
  } catch {
    return false;
  }
}

export async function submitPreworkWithRecovery<T>(opts: {
  camperId: number;
  itemKey: string;
  attempt: () => Promise<T>;
  /** Set false for calls that are not safe to repeat (e.g. "Complete Anyway" with a penalty). */
  retry?: boolean;
}): Promise<SubmitOutcome<T>> {
  const { camperId, itemKey, attempt, retry = true } = opts;
  try {
    return { kind: "ok", result: await attempt() };
  } catch (firstErr) {
    if (isReadOnlyError(firstErr)) throw firstErr;
    console.error(`[prework] ${itemKey} submit failed (attempt 1)`, firstErr);

    if (await isPreworkItemComplete(camperId, itemKey)) return { kind: "recovered" };
    if (!retry) throw firstErr;

    await sleep(800);
    try {
      return { kind: "ok", result: await attempt() };
    } catch (secondErr) {
      console.error(`[prework] ${itemKey} submit failed (attempt 2)`, secondErr);
      if (await isPreworkItemComplete(camperId, itemKey)) return { kind: "recovered" };
      throw secondErr;
    }
  }
}

/** Friendly failure text that still carries the technical detail for screenshots. */
export function preworkFailureMessage(label: string, err: unknown): string {
  let detail = "";
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; code?: unknown; name?: unknown };
    detail = [e.code, e.message ?? e.name].filter(Boolean).map(String).join(": ");
  } else if (err) {
    detail = String(err);
  }
  // A "not found" from the platform almost always means this tab is running an older copy
  // of the app from before a deploy. A refresh loads the current version.
  if (/not\s?found/i.test(detail)) {
    return `Couldn't save ${label}. The app was just updated, so please refresh the page and submit again. (${detail})`;
  }
  return `Couldn't save ${label}. Your answers are still here, so please try again in a moment.${detail ? ` (${detail})` : ""}`;
}
