import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import ThreadReplyBox from "@/components/ThreadReplyBox/index.js";
import { AUTHOR_STYLES, SENTIMENTS, timeAgo, type ManagerThread, type ThreadRole } from "@/lib/managerThreads";

type Props = {
  thread: ManagerThread;
  /** Who is viewing — controls labels and which reply box is shown. */
  viewerRole: ThreadRole;
  /** Show "Manager → cAMPer" header (counselor views). */
  showParticipants?: boolean;
  /** Extra actions next to the reply box (e.g. cAMPer "Got it"). */
  actions?: ReactNode;
  canReply?: boolean;
};

/** One conversation: the manager's original note/reaction, then replies oldest → newest. */
export default function ManagerThreadCard({ thread, viewerRole, showParticipants, actions, canReply = true }: Props) {
  const sentiment = SENTIMENTS.find((s) => s.value === thread.sentiment);
  const isReaction = thread.comment_type === "reaction";
  const counselorsOnly = thread.visibility === "counselor";

  return (
    <div className={`rounded-lg border p-3 ${thread.unread ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-1.5">
        {thread.unread && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Unread" />}
        {showParticipants ? (
          <span className="font-medium text-foreground">
            {thread.manager_name} <Icon icon="arrow-right" className="inline w-3 h-3 mx-0.5" /> {thread.camper_name}
          </span>
        ) : (
          <span className="font-medium text-foreground">
            {viewerRole === "camper" ? thread.manager_name : "You"}
          </span>
        )}
        <span>· {timeAgo(thread.created_at)}</span>
        {viewerRole !== "camper" && (
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              counselorsOnly ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <Icon icon={counselorsOnly ? "lock" : "eye"} className="w-3 h-3" />
            {counselorsOnly ? "Counselors only" : "Shared with cAMPer"}
          </span>
        )}
      </div>

      {/* Which activity item this is about */}
      {thread.target_label && (
        <p className="mb-1 inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          <Icon icon="link-2" className="h-3 w-3 shrink-0" />
          <span className="truncate">About: {thread.target_label}</span>
        </p>
      )}

      {/* Original note */}
      <div className="flex items-start gap-2">
        {!isReaction && sentiment && <Icon icon={sentiment.icon} className={`w-4 h-4 mt-0.5 shrink-0 ${sentiment.color}`} />}
        <p className={isReaction ? "text-base" : "text-sm text-foreground whitespace-pre-wrap"}>{thread.content}</p>
      </div>

      {thread.acknowledged_at && (
        <p className="mt-1.5 text-[11px] text-emerald-700 flex items-center gap-1">
          <Icon icon="thumbs-up" className="w-3 h-3" />
          {viewerRole === "camper" ? "You acknowledged this" : `${thread.camper_name.split(" ")[0]} acknowledged`} · {timeAgo(thread.acknowledged_at)}
        </p>
      )}

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
          {thread.replies.map((r) => {
            const style = AUTHOR_STYLES[r.author_type] ?? AUTHOR_STYLES.manager;
            const isMe = r.author_type === viewerRole;
            return (
              <div key={r.id} className="text-sm">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{isMe && viewerRole !== "counselor" ? "You" : r.author_name}</span>
                  <span className={`rounded px-1 py-px text-[9px] font-semibold ${style.className}`}>{style.label}</span>
                  <span>· {timeAgo(r.created_at)}</span>
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap">{r.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply + actions */}
      {(canReply || actions) && (
        <div className="mt-2.5 space-y-2">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          {canReply && <ThreadReplyBox commentId={thread.id} asRole={viewerRole} />}
        </div>
      )}
    </div>
  );
}
