/** Countdown text: "M:SS" under an hour, "H:MM:SS" at an hour or more. `padMinutes` gives "MM:SS". */
export function formatCountdown(totalSeconds: number, padMinutes = false): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${sec}`;
  return `${padMinutes ? String(m).padStart(2, "0") : m}:${sec}`;
}
