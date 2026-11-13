import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import MarkdownText from "@/components/MarkdownText/index.js";
import type { HubPresentation } from "@/lib/teamHub";

type Resource = { label?: string; url?: string; description?: string };

/** Mission brief + resources for one presentation, right inside the Team Hub. */
export default function HubBrief({ presentation }: { presentation: HubPresentation }) {
  const resources = (Array.isArray(presentation.resources) ? presentation.resources : []) as Resource[];
  const links = resources.filter((r) => typeof r.url === "string" && /^https?:\/\//i.test(r.url));
  const deck = presentation.deck_template_url && /^https?:\/\//i.test(presentation.deck_template_url)
    ? presentation.deck_template_url
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="p-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon icon="flag" className="h-4 w-4 text-primary" /> Mission brief
        </h3>
        {presentation.description && (
          <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">{presentation.description}</p>
        )}
        {presentation.instructions ? (
          <MarkdownText text={presentation.instructions} className="text-muted-foreground" />
        ) : (
          !presentation.description && <p className="text-sm text-muted-foreground">Counselors haven't added a brief yet.</p>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Timing</h3>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Icon icon="calendar" className="h-4 w-4" /> Day {presentation.day_number}</span>
            {!!presentation.prep_time_minutes && (
              <span className="flex items-center gap-2"><Icon icon="clock" className="h-4 w-4" /> {presentation.prep_time_minutes} min to prep</span>
            )}
            {!!presentation.present_time_minutes && (
              <span className="flex items-center gap-2"><Icon icon="timer" className="h-4 w-4" /> {presentation.present_time_minutes} min to present</span>
            )}
          </div>
        </Card>

        {(deck || links.length > 0) && (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Resources</h3>
            <div className="flex flex-col gap-2">
              {deck && (
                <ResourceLink url={deck} label="Deck template" description="Make a copy for your team" featured />
              )}
              {links.map((r, i) => (
                <ResourceLink key={i} url={r.url!} label={r.label || r.url!} description={r.description} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ResourceLink({ url, label, description, featured }: { url: string; label: string; description?: string; featured?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-start gap-2 rounded-md border p-2 text-left transition-colors hover:bg-muted/50 ${
        featured ? "border-primary/30 bg-primary/5" : "border-border"
      }`}
    >
      <Icon icon={featured ? "file-down" : "external-link"} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted-foreground line-clamp-2">{description}</span>}
      </span>
    </a>
  );
}
