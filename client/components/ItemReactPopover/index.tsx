import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import AudienceToggle from "@/components/AudienceToggle/index.js";
import { errorMessage } from "@/lib/cohortRefresh";
import { REACTIONS, refreshThreadViews, type Visibility } from "@/lib/managerThreads";

type Props = {
  camperId: number;
  camperFirstName: string;
  targetKey: string;
  targetTitle: string;
  /** Missed items default to a private counselor note; wins default to the cAMPer. */
  defaultAudience?: Visibility;
};

/** Manager: react to or comment on one specific activity item. */
export default function ItemReactPopover({ camperId, camperFirstName, targetKey, targetTitle, defaultAudience = "camper" }: Props) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<Visibility>(defaultAudience);
  const [note, setNote] = useState("");
  const { run: addComment, loading } = useApi("AddManagerComment");

  const send = useCallback(
    async (comment_type: "comment" | "reaction", content: string) => {
      try {
        await addComment({
          camper_id: camperId,
          comment_type,
          sentiment: comment_type === "reaction" ? "positive" : audience === "counselor" ? "feedback" : "encouraging",
          content,
          visibility: audience,
          target_key: targetKey,
        });
        await refreshThreadViews();
        toast.success(audience === "camper" ? `Sent to ${camperFirstName}` : "Shared with counselors");
        setNote("");
        setOpen(false);
      } catch (error) {
        toast.error("Couldn't send: " + errorMessage(error));
      }
    },
    [addComment, camperId, audience, targetKey, camperFirstName],
  );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setAudience(defaultAudience); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-full p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 print:hidden"
          aria-label={`React to ${targetTitle}`}
          title="React or comment"
        >
          <Icon icon="smile-plus" className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">About</p>
          <p className="truncate text-sm font-medium text-foreground">{targetTitle}</p>
        </div>
        <AudienceToggle value={audience} onChange={setAudience} camperFirstName={camperFirstName} />
        <div className="flex flex-wrap gap-1">
          {REACTIONS.map((r) => (
            <button
              key={r.emoji}
              type="button"
              disabled={loading}
              onClick={() => send("reaction", `${r.emoji} ${r.label}`)}
              title={r.label}
              className="rounded-md px-1.5 py-0.5 text-lg transition-transform hover:scale-125 disabled:opacity-50"
            >
              {r.emoji}
            </button>
          ))}
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder={audience === "camper" ? `Say something to ${camperFirstName} about this…` : "Note for the counselors…"}
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button size="sm" disabled={loading || !note.trim()} onClick={() => send("comment", note.trim())}>
            {loading ? "Sending…" : "Send note"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
