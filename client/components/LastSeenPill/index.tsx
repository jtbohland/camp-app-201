import { Icon } from "@/components/ui/icon";
import { daysSinceLastSeen, formatLastSeen, formatLastSeenFull } from "@/lib/lastSeen.js";

type Props = {
  lastSeenAt: string | null | undefined;
  /** "pill" for tiles and headers, "inline" for plain text rows. */
  variant?: "pill" | "inline";
};

/** Last time a cAMPer opened the app. Amber after 3 days, red if never. */
export default function LastSeenPill({ lastSeenAt, variant = "pill" }: Props) {
  const days = daysSinceLastSeen(lastSeenAt);
  const tone =
    days === null ? "bg-red-100 text-red-700" : days >= 3 ? "bg-amber-100 text-amber-800" : "bg-sky-50 text-sky-700";
  const label = `Last login: ${formatLastSeen(lastSeenAt)}`;

  if (variant === "inline") {
    return <span title={formatLastSeenFull(lastSeenAt)}>{formatLastSeen(lastSeenAt)}</span>;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
      title={formatLastSeenFull(lastSeenAt)}
    >
      <Icon icon="log-in" className="h-3 w-3" />
      {label}
    </span>
  );
}
