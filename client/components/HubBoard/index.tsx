import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import HubPostCard from "@/components/HubPostCard/index.js";
import HubComposer from "@/components/HubComposer/index.js";
import { ITEM_TYPES, type HubItem, type HubMember } from "@/lib/teamHub";
import type { HubPostActions } from "@/components/TeamHubView/useHubPosts";

type Props = {
  section: string;
  title: string;
  hint: string;
  items: HubItem[];
  members: HubMember[];
  myCamperId: number | null;
  isCounselor: boolean;
  canContribute: boolean;
  actions: HubPostActions;
  fetching: boolean;
};

const PAGE_SIZE = 20;

/** A list of hub posts with a composer and type filter. Pinned first, open to-dos before done ones. */
export default function HubBoard({ section, title, hint, items, members, myCamperId, isCounselor, canContribute, actions, fetching }: Props) {
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  const sorted = useMemo(() => {
    const list = filter === "all" ? items : items.filter((i) => i.item_type === filter);
    return [...list].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [items, filter]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.item_type, (m.get(i.item_type) ?? 0) + 1);
    return m;
  }, [items]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {canContribute && !composing && (
          <Button size="sm" onClick={() => setComposing(true)}>
            <Icon icon="plus" className="mr-1 h-4 w-4" /> Add
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All ${items.length}`} />
          {ITEM_TYPES.filter((t) => counts.has(t.key)).map((t) => (
            <FilterChip
              key={t.key}
              active={filter === t.key}
              onClick={() => setFilter(t.key)}
              label={`${t.label} ${counts.get(t.key)}`}
            />
          ))}
        </div>
      )}

      {composing && (
        <HubComposer
          members={members}
          saving={actions.adding}
          onSubmit={async (post) => {
            const ok = await actions.add(section, post);
            if (ok) setComposing(false);
            return ok;
          }}
          onCancel={() => setComposing(false)}
        />
      )}

      {fetching && <p className="text-xs text-muted-foreground">Updating…</p>}
      <div className={`flex flex-col gap-2.5 ${fetching ? "opacity-70" : ""}`}>
        {sorted.length === 0 && !composing ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 py-10 text-center">
            <Icon icon="layout-list" className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">Nothing here yet</p>
            {canContribute && (
              <p className="mt-1 text-xs text-muted-foreground">Add notes, ideas, links, decks, or to-dos for your team.</p>
            )}
          </div>
        ) : (
          sorted.slice(0, shown).map((item) => (
            <HubPostCard
              key={item.id}
              item={item}
              members={members}
              myCamperId={myCamperId}
              isCounselor={isCounselor}
              canContribute={canContribute}
              onPatch={actions.patch}
              onDelete={actions.requestDelete}
            />
          ))
        )}
        {sorted.length > shown && (
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Show more ({sorted.length - shown} left)
          </Button>
        )}
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
        active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
