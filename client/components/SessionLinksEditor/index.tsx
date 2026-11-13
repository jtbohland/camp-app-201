import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

export type SessionLink = { title: string; url: string };

type Props = {
  links: SessionLink[];
  onChange: (links: SessionLink[]) => void;
  compact?: boolean;
  /** Shown under the heading, e.g. which tiles this applies to. */
  hint?: string;
};

const MAX_LINKS = 10;

export const isValidUrl = (u: string) => /^https?:\/\/[^\s]+$/i.test(u.trim());

/** Fills in a name from the URL so a pasted link is never nameless. */
export function guessLinkTitle(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/presentation") || u.includes("slides")) return "Slide deck";
  if (u.includes("docs.google.com/document")) return "Doc";
  if (u.includes("docs.google.com/spreadsheets")) return "Sheet";
  if (u.includes("figma.com")) return "Figma";
  if (u.includes("loom.com") || u.includes("youtube.com") || u.includes("youtu.be")) return "Video";
  return "Resource";
}

/** Rows ready to save: trimmed, blank rows dropped, a name filled in where missing. */
export function cleanLinks(links: SessionLink[]): SessionLink[] {
  return links
    .map((l) => ({ title: l.title.trim(), url: l.url.trim() }))
    .filter((l) => l.url.length > 0)
    .map((l) => ({ ...l, title: l.title || guessLinkTitle(l.url) }));
}

export const linksInvalid = (links: SessionLink[]) => cleanLinks(links).some((l) => !isValidUrl(l.url));

export const sameLinks = (a: SessionLink[], b: SessionLink[]) =>
  JSON.stringify(cleanLinks(a)) === JSON.stringify(cleanLinks(b));

/** Slide decks / resource links on a session. Add as many as needed (up to 10). */
export default function SessionLinksEditor({ links, onChange, compact = false, hint }: Props) {
  const h = compact ? "h-7 text-xs" : "h-8 text-xs";
  const update = (i: number, patch: Partial<SessionLink>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(links.filter((_, j) => j !== i));

  return (
    <div className={`rounded-lg border border-border bg-card ${compact ? "p-2" : "p-3"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Icon icon="presentation" className="h-3.5 w-3.5 text-amber-500" />
          Slides & resources
          {links.length > 0 && <span className="font-normal text-muted-foreground">({links.length})</span>}
        </p>
        {links.length < MAX_LINKS && (
          <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => onChange([...links, { title: "", url: "" }])}>
            <Icon icon="plus" className="h-3 w-3" /> Add link
          </Button>
        )}
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}

      {links.length === 0 ? (
        <button
          type="button"
          onClick={() => onChange([{ title: "", url: "" }])}
          className="mt-2 w-full rounded-md border border-dashed border-border py-2 text-[11px] text-muted-foreground transition-colors hover:border-amber-300 hover:bg-amber-50/40"
        >
          No deck yet · add a link cAMPers can follow along with
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {links.map((l, i) => {
            const bad = l.url.trim().length > 0 && !isValidUrl(l.url);
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Input
                    value={l.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder={l.url ? guessLinkTitle(l.url) : "Name (e.g. Slide deck)"}
                    maxLength={120}
                    className={`${h} ${compact ? "w-[38%]" : "w-[35%]"}`}
                  />
                  <Input
                    value={l.url}
                    onChange={(e) => update(i, { url: e.target.value })}
                    placeholder="https://…"
                    className={`${h} flex-1 ${bad ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                  />
                  <button type="button" onClick={() => remove(i)} className="p-1 text-muted-foreground hover:text-red-500" title="Remove link">
                    <Icon icon="x" className="h-3.5 w-3.5" />
                  </button>
                </div>
                {bad && <p className="text-[10px] text-red-600">Links need to start with https://</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
