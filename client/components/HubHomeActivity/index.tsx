import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { itemTypeMeta, timeAgo, type HubItem } from "@/lib/teamHub";

type Props = {
  pinned: HubItem[];
  recent: HubItem[];
  boardLabel: (item: HubItem) => string | undefined;
  onOpenBoard: (item: HubItem) => void;
};

/** Pinned posts and the latest activity across all of the team's boards. */
export default function HubHomeActivity({ pinned, recent, boardLabel, onOpenBoard }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon icon="pin" className="h-4 w-4 text-primary" /> Pinned
        </h3>
        {pinned.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pin the deck link, your customer research, or key decisions so everyone can find them.</p>
        ) : (
          <ActivityList items={pinned.slice(0, 8)} boardLabel={boardLabel} onOpenBoard={onOpenBoard} />
        )}
      </Card>
      <Card className="p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon icon="activity" className="h-4 w-4 text-primary" /> Recent activity
        </h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Kick things off on the Team Board.</p>
        ) : (
          <ActivityList items={recent.slice(0, 8)} boardLabel={boardLabel} onOpenBoard={onOpenBoard} showAuthor />
        )}
      </Card>
    </div>
  );
}

function ActivityList({ items, boardLabel, onOpenBoard, showAuthor }: {
  items: HubItem[];
  boardLabel: (item: HubItem) => string | undefined;
  onOpenBoard: (item: HubItem) => void;
  showAuthor?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {items.map((i) => (
        <div key={i.id} className="flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40">
          <Icon icon={itemTypeMeta(i.item_type).icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <button type="button" onClick={() => onOpenBoard(i)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm text-foreground">{i.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {showAuthor ? `${i.author_name} · ${timeAgo(i.created_at)}` : boardLabel(i) ?? "Team Board"}
              {showAuthor && boardLabel(i) && ` · ${boardLabel(i)}`}
            </p>
          </button>
          {i.link_url && (
            <a href={i.link_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary" aria-label="Open link">
              <Icon icon="external-link" className="h-4 w-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
