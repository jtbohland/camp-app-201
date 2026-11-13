import { Icon } from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { linkIcon } from "@/lib/sessionResources.js";

type Props = {
  links: { id: number; title: string; url: string }[];
};

const pillClass =
  "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200";

/** "Slides" pill on an agenda tile. One link opens directly; several open a small menu. */
export default function SessionResourcesPill({ links }: Props) {
  if (links.length === 0) return null;

  if (links.length === 1) {
    const l = links[0];
    return (
      <a href={l.url} target="_blank" rel="noopener noreferrer" className={pillClass} title={`Open ${l.title}`} onClick={(e) => e.stopPropagation()}>
        <Icon icon={linkIcon(l.url)} className="h-3 w-3" />
        {l.title}
        <Icon icon="external-link" className="h-3 w-3" />
      </a>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={pillClass} onClick={(e) => e.stopPropagation()}>
          <Icon icon="presentation" className="h-3 w-3" />
          Resources · {links.length}
          <Icon icon="chevron-down" className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Follow along</p>
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent"
          >
            <Icon icon={linkIcon(l.url)} className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="min-w-0 flex-1 truncate">{l.title}</span>
            <Icon icon="external-link" className="h-3 w-3 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
