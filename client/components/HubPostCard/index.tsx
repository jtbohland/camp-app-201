import { memo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { itemTypeMeta, timeAgo, type HubItem, type HubMember } from "@/lib/teamHub";

export type PostPatch = {
  title?: string;
  content?: string;
  link_url?: string;
  is_pinned?: boolean;
  is_done?: boolean;
  assignee_id?: number | null;
};

type Props = {
  item: HubItem;
  members: HubMember[];
  myCamperId: number | null;
  isCounselor: boolean;
  canContribute: boolean;
  /** Shown as a small pill when the post sits on a different board (e.g. on Home). */
  boardLabel?: string;
  onPatch: (item: HubItem, patch: PostPatch) => void;
  onDelete: (item: HubItem) => void;
};

/** One Team Hub post: note, idea, link, deck, or to-do. */
function HubPostCard({ item, members, myCamperId, isCounselor, canContribute, boardLabel, onPatch, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content ?? "");
  const [link, setLink] = useState(item.link_url ?? "");

  const meta = itemTypeMeta(item.item_type);
  const isTask = item.item_type === "task";
  const isTemp = item.id < 0;
  const canEditContent = canContribute && !isTemp && (item.author_id === myCamperId || isCounselor);
  const canOrganize = canContribute && !isTemp;

  const startEdit = () => {
    setTitle(item.title);
    setContent(item.content ?? "");
    setLink(item.link_url ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    if (!title.trim()) return;
    onPatch(item, { title: title.trim(), content: content.trim(), link_url: link.trim() });
    setEditing(false);
  };

  return (
    <div
      className={`rounded-lg border bg-card p-4 transition-colors ${
        item.is_pinned ? "border-primary/40 ring-1 ring-primary/15" : "border-border hover:border-primary/30"
      } ${isTask && item.is_done ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        {isTask ? (
          <button
            type="button"
            disabled={!canOrganize}
            onClick={() => onPatch(item, { is_done: !item.is_done })}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary disabled:cursor-default"
            aria-label={item.is_done ? "Mark not done" : "Mark done"}
          >
            <Icon icon={item.is_done ? "square-check" : "square"} className={`h-5 w-5 ${item.is_done ? "text-primary" : ""}`} />
          </button>
        ) : (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon icon={meta.icon} className="h-4 w-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} maxLength={5000} />
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (optional)" maxLength={2000} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} disabled={!title.trim()}>Save</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {item.is_pinned && <Icon icon="pin" className="h-3.5 w-3.5 text-primary" />}
                <h3 className={`text-sm font-medium text-foreground ${isTask && item.is_done ? "line-through" : ""}`}>
                  {item.title}
                </h3>
                {boardLabel && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{boardLabel}</span>
                )}
              </div>
              {item.content && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6">{item.content}</p>
              )}
              {item.link_url && (
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-primary hover:bg-muted"
                >
                  <Icon icon="external-link" className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.link_url.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </>
          )}

          {!editing && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
              <span>{item.author_name}</span>
              <span>·</span>
              <span>{timeAgo(item.created_at)}</span>
              {isTask && (
                <AssigneePicker
                  item={item}
                  members={members}
                  disabled={!canOrganize}
                  onChange={(id) => onPatch(item, { assignee_id: id })}
                />
              )}
            </div>
          )}
        </div>

        {!editing && canOrganize && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Post options">
                <Icon icon="ellipsis" className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPatch(item, { is_pinned: !item.is_pinned })}>
                <Icon icon={item.is_pinned ? "pin-off" : "pin"} className="mr-2 h-4 w-4" />
                {item.is_pinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
              {canEditContent && (
                <>
                  <DropdownMenuItem onClick={startEdit}>
                    <Icon icon="pencil" className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
                    <Icon icon="trash-2" className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function AssigneePicker({ item, members, disabled, onChange }: {
  item: HubItem;
  members: HubMember[];
  disabled: boolean;
  onChange: (id: number | null) => void;
}) {
  const label = item.assignee_name ?? "Unassigned";
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1"><Icon icon="user" className="h-3 w-3" />{label}</span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 hover:text-foreground">
          <Icon icon="user" className="h-3 w-3" />
          {label}
          <Icon icon="chevron-down" className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {members.map((m) => (
          <DropdownMenuItem key={m.id} onClick={() => onChange(m.id)}>
            {m.first_name} {m.last_name}
            {m.id === item.assignee_id && <Icon icon="check" className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {item.assignee_id !== null && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(null)}>Unassign</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default memo(HubPostCard);
