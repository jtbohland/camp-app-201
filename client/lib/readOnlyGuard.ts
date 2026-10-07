/**
 * App-wide read-only switch for counselors viewing a past cohort.
 * Set by useCohortView; checked by the useApi wrapper before any write runs.
 */
let readOnly = false;

export function setReadOnlyMode(value: boolean): void {
  readOnly = value;
}

// Calls that are safe while viewing a past cohort (reads, and switching back).
const ALWAYS_ALLOWED = new Set(["SetViewCohort", "TrackLinkClick"]);

export function isWriteBlocked(apiName: string): boolean {
  if (!readOnly) return false;
  if (ALWAYS_ALLOWED.has(apiName)) return false;
  return !apiName.startsWith("Get");
}

export const READ_ONLY_MESSAGE =
  "You're viewing a past cohort (read-only). Switch back to the active cohort to make changes.";
