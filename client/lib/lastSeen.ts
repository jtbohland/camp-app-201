/** Friendly "last login" text, e.g. "Today 9:14 AM", "Yesterday", "3 days ago", "Nov 2". */
export function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso.includes("T") || iso.includes("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "Never";

  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (days <= 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/** Full date + time for tooltips. */
export function formatLastSeenFull(iso: string | null | undefined): string {
  if (!iso) return "Hasn't opened the app yet";
  const d = new Date(iso.includes("T") || iso.includes("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "Hasn't opened the app yet";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Days since last login (null = never). */
export function daysSinceLastSeen(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") || iso.includes("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
