import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { errorMessage } from "@/lib/cohortRefresh";
import { refreshThreadViews, type ThreadRole } from "@/lib/managerThreads";

type Props = {
  commentId: number;
  asRole: ThreadRole;
  placeholder?: string;
};

/** Small reply box under a thread. Posts as the signed-in user in the given role. */
export default function ThreadReplyBox({ commentId, asRole, placeholder }: Props) {
  const [text, setText] = useState("");
  const { run: reply, loading } = useApi("ReplyToManagerThread");

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    try {
      await reply({ comment_id: commentId, as_role: asRole, content });
      setText("");
      await refreshThreadViews();
    } catch (error) {
      toast.error("Couldn't send reply: " + errorMessage(error));
    }
  }, [text, reply, commentId, asRole]);

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? "Write a reply…"}
        rows={1}
        maxLength={2000}
        className="min-h-[36px] text-sm resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <Button size="sm" onClick={handleSend} disabled={loading || !text.trim()} aria-label="Send reply">
        <Icon icon={loading ? "loader-2" : "send"} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
