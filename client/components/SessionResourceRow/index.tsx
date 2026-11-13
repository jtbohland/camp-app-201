import { Icon } from "@/components/ui/icon";
import { formatClock, linkIcon, type SessionResourceGroup } from "@/lib/sessionResources.js";

type Props = {
  session: SessionResourceGroup;
  /** Smaller layout for the Team Hub home card. */
  compact?: boolean;
};

/** One session and its links, as used on the Resources tab and in Team Hubs. */
export default function SessionResourceRow({ session, compact = false }: Props) {
  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "py-2.5" : "rounded-lg border border-border bg-card p-3"}`}>
      <div className="flex items-baseline gap-2">
        <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{formatClock(session.startTime)}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {session.sessionType === "executive" && "⭐ "}
          {session.sessionTitle}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 pl-[4.5rem]">
        {session.links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100"
          >
            <Icon icon={linkIcon(l.url)} className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="truncate">{l.title}</span>
            <Icon icon="external-link" className="h-3 w-3 shrink-0 text-amber-600/70" />
          </a>
        ))}
      </div>
    </div>
  );
}
