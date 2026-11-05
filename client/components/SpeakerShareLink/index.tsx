import { useCallback, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { getSpeakerInviteMessage, getSpeakerShareLink, type Executive } from "@/lib/speakers.js";

type Props = { executive: Executive };

/** Counselor-only box with the speaker's share link. Copying it clears the "Not shared yet" pill. */
export default function SpeakerShareLink({ executive }: Props) {
  const { run: markCopied } = useApi("MarkSpeakerLinkCopied");
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const link = getSpeakerShareLink(executive.id);

  const copy = useCallback(
    async (what: "link" | "message") => {
      try {
        await navigator.clipboard.writeText(what === "link" ? link : getSpeakerInviteMessage(executive));
        setCopied(what);
        setTimeout(() => setCopied(null), 2000);
        toast.success(what === "link" ? "Link copied" : "Slack message copied");
      } catch {
        toast.error("Couldn't copy. Select the link and copy it manually.");
        return;
      }
      if (!executive.link_copied_at) {
        try {
          await markCopied({ executive_id: executive.id });
          await queryClient.invalidateQueries("GetExecutives");
        } catch {
          // The copy worked; the pill just stays until next time.
        }
      }
    },
    [executive, link, markCopied]
  );

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Icon icon="link" className="h-3.5 w-3.5 text-primary" />
          Speaker share link
        </p>
        {executive.link_copied_at ? (
          <span className="text-[10px] font-medium text-emerald-700">
            Shared {new Date(executive.link_copied_at).toLocaleDateString()}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Not shared yet</span>
        )}
      </div>
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full truncate rounded-md border border-input bg-background px-2 py-1.5 font-mono text-[11px] text-foreground"
      />
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => copy("link")}>
          <Icon icon={copied === "link" ? "check" : "copy"} className="mr-1 h-3.5 w-3.5" />
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => copy("message")}>
          <Icon icon={copied === "message" ? "check" : "message-square"} className="mr-1 h-3.5 w-3.5" />
          {copied === "message" ? "Copied" : "Copy Slack message"}
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        They sign in with {executive.email ?? "the email above"} and land on their Q&A.
      </p>
    </div>
  );
}
