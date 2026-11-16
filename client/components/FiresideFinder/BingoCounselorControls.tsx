import { useCallback, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import { errorMessage } from "@/lib/cohortRefresh";

type Props = {
  presentationId: number;
  closed: boolean;
  revealed: boolean;
  /** Counselor's private peek at the answers (only on their own screen). */
  peeking: boolean;
  onPeekChange: (peek: boolean) => void;
};

type Action = "end" | "reopen" | "reveal" | "hide";

const CONFIRM: Record<Action, { title: string; body: string; cta: string }> = {
  end: {
    title: "End Fireside Finder?",
    body: "No one can make more guesses or earn more Fireside Finder points. Scores so far stay as they are. You can reopen it later.",
    cta: "End game",
  },
  reopen: {
    title: "Reopen Fireside Finder?",
    body: "cAMPers can make guesses and earn points again. Revealed answers are hidden again.",
    cta: "Reopen game",
  },
  reveal: {
    title: "Reveal answers to everyone?",
    body: "Every cAMPer will see who each square belongs to. This also ends the game, so no one can earn points by copying the answers.",
    cta: "Reveal to everyone",
  },
  hide: {
    title: "Hide answers from cAMPers?",
    body: "cAMPers will stop seeing who each square belongs to. The game stays ended.",
    cta: "Hide answers",
  },
};

/** Counselor-only: peek at answers, reveal them to everyone, and end or reopen the game. */
export default function BingoCounselorControls({ presentationId, closed, revealed, peeking, onPeekChange }: Props) {
  const { run: setState, loading } = useApi("SetBingoGameState");
  const [pending, setPending] = useState<Action | null>(null);

  const apply = useCallback(async () => {
    if (!pending) return;
    try {
      await setState({
        presentation_id: presentationId,
        closed: pending === "end" ? true : pending === "reopen" ? false : null,
        revealed: pending === "reveal" ? true : pending === "hide" ? false : null,
      });
      await queryClient.invalidateQueries("GetBingoCard");
      toast.success(
        pending === "end" ? "Fireside Finder ended" :
        pending === "reopen" ? "Fireside Finder reopened" :
        pending === "reveal" ? "Answers revealed to everyone" : "Answers hidden"
      );
      setPending(null);
    } catch (e) {
      toast.error("Couldn't update Fireside Finder: " + errorMessage(e));
    }
  }, [pending, presentationId, setState]);

  const c = pending ? CONFIRM[pending] : null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!revealed && (
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => onPeekChange(!peeking)}>
          <Icon icon={peeking ? "eye-off" : "eye"} className="mr-1 h-3.5 w-3.5" />
          {peeking ? "Stop peeking" : "Peek (just me)"}
        </Button>
      )}
      <Button variant="outline" size="sm" className="text-xs" onClick={() => setPending(revealed ? "hide" : "reveal")}>
        <Icon icon={revealed ? "eye-off" : "megaphone"} className="mr-1 h-3.5 w-3.5" />
        {revealed ? "Hide answers" : "Reveal answers to everyone"}
      </Button>
      <Button
        variant={closed ? "outline" : "destructive"}
        size="sm"
        className="text-xs"
        onClick={() => setPending(closed ? "reopen" : "end")}
      >
        <Icon icon={closed ? "rotate-ccw" : "flag"} className="mr-1 h-3.5 w-3.5" />
        {closed ? "Reopen game" : "End game"}
      </Button>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{c?.title}</DialogTitle>
            <DialogDescription>{c?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={loading}>Cancel</Button>
            <Button variant={pending === "end" ? "destructive" : "default"} onClick={apply} disabled={loading}>
              {loading ? "Saving…" : c?.cta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
