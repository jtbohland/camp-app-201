import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { usePointsBubble } from "@/components/PointsBubble/index.js";

const APP_URL = "https://app.superblocks.com"; // Will be replaced with real deployed URL

const SLACK_MESSAGE = `🏕️ I'm headed to cAMP 201!

cAMP 201 is Amplitude's in-person GTM capstone — the final summit of our onboarding journey in San Francisco. Track my engagement, points, badges, leaderboard status, and see if I earn the title of cAMP Champ! 🏆

Check out my progress: ${APP_URL}`;

type Props = {
  camperId: number;
  onComplete: () => void;
};

export default function ShareWithManagerTile({ camperId, onComplete }: Props) {
  const showPoints = usePointsBubble();
  const [copied, setCopied] = useState(false);
  const { run: completeItem, loading: completing } = useApi("CompletePreworkItem");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SLACK_MESSAGE);
      setCopied(true);
      toast.success("Copied! Slack it to your manager");
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = SLACK_MESSAGE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success("Copied! Slack it to your manager");
    }
  }, []);

  const handleComplete = useCallback(async () => {
    try {
      const result = await completeItem({
        user_id: camperId,
        item: "share_with_manager",
        content_id: 100,
        force: false,
      });
      if (result?.success) {
        if ((result.pointsAwarded as number) > 0) {
          showPoints(result.pointsAwarded as number);
        }
        toast.success("Shared with manager — nice work! 🏕️");
        onComplete();
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      toast.error("Failed: " + msg);
    }
  }, [camperId, completeItem, onComplete, showPoints]);

  return (
    <Card className="overflow-hidden border-2 border-sky-200 bg-gradient-to-br from-sky-50/80 to-blue-50/40">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center">
            <Icon icon="send" className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-sky-900">Share cAMP 201 with Your Manager</h3>
            <p className="text-xs text-sky-700/70">Let your manager track your cAMP journey</p>
          </div>
        </div>

        {/* Preview of the message */}
        <div className="bg-white/80 border border-sky-100 rounded-lg p-3 text-xs text-sky-900/80 space-y-1.5">
          <p className="font-semibold">🏕️ I'm headed to cAMP 201!</p>
          <p className="text-[11px] text-sky-700/60 leading-relaxed">
            cAMP 201 is Amplitude's in-person GTM capstone — the final summit of our onboarding journey in San Francisco. Track my engagement, points, badges, leaderboard status, and see if I earn the title of cAMP Champ! 🏆
          </p>
          <p className="text-[11px] text-sky-500/50 break-all">{APP_URL}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className={`flex-1 ${
              copied
                ? "bg-sky-100 border-sky-300 text-sky-700"
                : "border-sky-200 text-sky-700 hover:bg-sky-50"
            }`}
          >
            <Icon icon={copied ? "check" : "copy"} className="w-3.5 h-3.5 mr-1.5" />
            {copied ? "Copied!" : "Copy Slack Message"}
          </Button>

          <Button
            onClick={handleComplete}
            disabled={!copied || completing}
            size="sm"
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40"
          >
            {completing ? "Completing..." : "Mark Complete"}
          </Button>
        </div>

        {!copied && (
          <p className="text-[10px] text-sky-600/60 text-center">
            Copy the message first, then mark complete after sending to your manager
          </p>
        )}
      </div>
    </Card>
  );
}
