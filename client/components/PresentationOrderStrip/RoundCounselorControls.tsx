import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Presentation = { id: number; title: string; day_number: number | null };
type Action = "start" | "undo_last" | "restart" | "end";

type Props = {
  presentations: Presentation[];
  activeId: number | null;
  hasPicks: boolean;
  busy: boolean;
  onAction: (action: Action, presentationId: number | null) => void;
};

/** Counselor-only: choose the live presentation, undo a pick, restart, or end the round. */
export default function RoundCounselorControls({ presentations, activeId, hasPicks, busy, onAction }: Props) {
  const [choice, setChoice] = useState<string>("");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const selected = choice ? Number(choice) : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-indigo-200 bg-white/60 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-900/70">Counselor</span>
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="min-w-[220px] flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
        aria-label="Presentation to run"
      >
        <option value="">{activeId ? "Switch presentation…" : "Pick the presentation…"}</option>
        {presentations.map((p) => (
          <option key={p.id} value={p.id} disabled={p.id === activeId}>
            {p.day_number ? `Day ${p.day_number} · ` : ""}{p.title}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={busy || selected === null}
        onClick={() => { onAction("start", selected); setChoice(""); }}
        className="bg-indigo-600 text-white hover:bg-indigo-700"
      >
        <Icon icon="play" className="mr-1 h-3.5 w-3.5" /> Start
      </Button>
      {activeId !== null && (
        <>
          <Button size="sm" variant="outline" disabled={busy || !hasPicks} onClick={() => onAction("undo_last", null)}>
            <Icon icon="undo-2" className="mr-1 h-3.5 w-3.5" /> Undo last pick
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !hasPicks} onClick={() => setConfirmRestart(true)}>
            <Icon icon="rotate-ccw" className="mr-1 h-3.5 w-3.5" /> Restart
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction("end", null)}>
            <Icon icon="square" className="mr-1 h-3.5 w-3.5" /> End round
          </Button>
        </>
      )}

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restart this round?</DialogTitle>
            <DialogDescription>
              The presenting order is cleared and every team can be picked again. Scores already given are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestart(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmRestart(false); onAction("restart", null); }}>Restart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
