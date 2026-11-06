import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import AudienceToggle from "@/components/AudienceToggle/index.js";
import ManagerThreadCard from "@/components/ManagerThreadCard/index.js";
import { errorMessage } from "@/lib/cohortRefresh";
import { REACTIONS, SENTIMENTS, refreshThreadViews, type ManagerThread, type Visibility } from "@/lib/managerThreads";

type Props = {
  camperId: number;
  camperFirstName: string;
  threads: ManagerThread[];
  unreadCount: number;
  /** False after camp closes: history stays readable but no new notes. */
  canWrite: boolean;
};

/** Manager side of the conversation with one hire: react, write a note (choose audience), read + reply to threads. */
export default function HireConversations({ camperId, camperFirstName, threads, unreadCount, canWrite }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState("positive");
  const [audience, setAudience] = useState<Visibility>("camper");
  const [reactionAudience, setReactionAudience] = useState<Visibility>("camper");

  const { run: addComment, loading: adding } = useApi("AddManagerComment");
  const { run: markRead } = useApi("MarkManagerThreadsRead");

  // Opening the conversations clears this hire's unread badge
  useEffect(() => {
    if (!open) return;
    const ids = threads.filter((t) => t.unread).map((t) => t.id);
    if (ids.length === 0) return;
    markRead({ as_role: "manager", comment_ids: ids })
      .then(() => refreshThreadViews())
      .catch(() => {});
  }, [open, threads, markRead]);

  const post = useCallback(
    async (args: { comment_type: "comment" | "reaction"; sentiment: string; content: string; visibility: Visibility }) => {
      await addComment({
        camper_id: camperId,
        comment_type: args.comment_type,
        sentiment: args.sentiment as "positive" | "encouraging" | "feedback" | "concerning",
        content: args.content,
        visibility: args.visibility,
        target_key: null,
      });
      await refreshThreadViews();
    },
    [addComment, camperId],
  );

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;
    try {
      await post({ comment_type: "comment", sentiment, content: content.trim(), visibility: audience });
      toast.success(audience === "camper" ? `Sent to ${camperFirstName}` : "Note sent to counselors");
      setContent("");
      setShowForm(false);
      setOpen(true);
    } catch (error) {
      toast.error("Couldn't post: " + errorMessage(error));
    }
  }, [content, sentiment, audience, post, camperFirstName]);

  const handleReaction = useCallback(async (emoji: string, label: string) => {
    try {
      await post({ comment_type: "reaction", sentiment: "positive", content: `${emoji} ${label}`, visibility: reactionAudience });
      toast.success(reactionAudience === "camper" ? `Sent ${emoji} to ${camperFirstName}` : `${emoji} shared with counselors`);
    } catch (error) {
      toast.error("Couldn't react: " + errorMessage(error));
    }
  }, [post, reactionAudience, camperFirstName]);

  return (
    <div className="space-y-3 mb-3">
      {canWrite && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">React:</span>
          {REACTIONS.map((r) => (
            <button
              key={r.emoji}
              onClick={() => handleReaction(r.emoji, r.label)}
              disabled={adding}
              title={`${r.label} (${reactionAudience === "camper" ? `sent to ${camperFirstName}` : "counselors only"})`}
              className="text-lg hover:scale-125 transition-transform disabled:opacity-50"
            >
              {r.emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReactionAudience((a) => (a === "camper" ? "counselor" : "camper"))}
            className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              reactionAudience === "camper" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
            }`}
            title="Click to switch who sees reactions"
          >
            <Icon icon={reactionAudience === "camper" ? "eye" : "lock"} className="w-3 h-3" />
            {reactionAudience === "camper" ? `To ${camperFirstName}` : "Counselors only"}
          </button>
          <Button variant="ghost" size="sm" className="ml-auto text-xs h-7" onClick={() => setShowForm(!showForm)}>
            <Icon icon="message-circle" className="w-3.5 h-3.5 mr-1" />Write a note
          </Button>
        </div>
      )}

      {showForm && canWrite && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border">
          <div className="flex flex-wrap items-start gap-3">
            <AudienceToggle value={audience} onChange={setAudience} camperFirstName={camperFirstName} />
            <Select value={sentiment} onValueChange={setSentiment}>
              <SelectTrigger className="w-40 h-8 text-xs ml-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SENTIMENTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-1.5">
                      <Icon icon={s.icon} className={`w-3.5 h-3.5 ${s.color}`} />{s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder={audience === "camper" ? `Encourage ${camperFirstName}, ask a question, celebrate a win…` : "Share context or a concern with the counselors…"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            maxLength={2000}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={adding || !content.trim()}>
              {adding ? "Sending…" : audience === "camper" ? `Send to ${camperFirstName}` : "Send to counselors"}
            </Button>
          </div>
        </div>
      )}

      {threads.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Icon icon="messages-square" className="w-3.5 h-3.5" />
            {threads.length} conversation{threads.length !== 1 ? "s" : ""}
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">
                {unreadCount} new
              </span>
            )}
            <Icon icon={open ? "chevron-up" : "chevron-down"} className="w-3.5 h-3.5" />
          </button>
          {open && (
            <div className="mt-2 space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {threads.slice(0, 30).map((t) => (
                <ManagerThreadCard key={t.id} thread={t} viewerRole="manager" canReply={canWrite} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
