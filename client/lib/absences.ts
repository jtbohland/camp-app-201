/** "1h 30m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/** Date → value for <input type="datetime-local"> in the viewer's own time zone. */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const APPROVAL_LABELS: Record<string, { label: string; className: string }> = {
  standard: { label: "Excused", className: "bg-emerald-50 text-emerald-700" },
  counselor_penalty: { label: "Counselor approved (−1 pt)", className: "bg-red-100 text-red-700" },
  counselor_emergency: { label: "Emergency (no penalty)", className: "bg-sky-100 text-sky-800" },
};

/** An absence withdrawn because it overlapped a required session. Doesn't count toward the 3. */
export const WITHDRAWN_LABEL = { label: "Withdrawn", className: "bg-muted text-muted-foreground line-through" };
