import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export type Announcement = {
  id: number;
  title: string;
  body: string;
  priority: string;
  pinned: boolean;
  author_name: string | null;
  created_at: string;
};

const PRIORITY_STYLES: Record<string, string> = {
  normal: "border-border",
  important: "border-amber-500/40 bg-amber-900/5",
  urgent: "border-red-500/40 bg-red-900/5",
};

type Props = {
  announcement: Announcement;
  /** Counselors get edit and delete buttons. */
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export default function AnnouncementCard({ announcement, canManage, onEdit, onDelete }: Props) {
  return (
    <Card className={`group p-3 ${PRIORITY_STYLES[announcement.priority] ?? ""}`}>
      <div className="flex items-start gap-2">
        {announcement.pinned && <Icon icon="pin" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-foreground break-words">{announcement.title}</h4>
          <p className="text-[11px] text-foreground/70 mt-0.5 whitespace-pre-line break-words">{announcement.body}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {new Date(announcement.created_at).toLocaleDateString(undefined, {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Edit announcement"
              aria-label="Edit announcement"
            >
              <Icon icon="pencil" className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              title="Delete announcement"
              aria-label="Delete announcement"
            >
              <Icon icon="x" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
