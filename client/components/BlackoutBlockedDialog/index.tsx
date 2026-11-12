import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BLACKOUT_REMINDER, blackoutWhen, type BlackoutSession } from "@/lib/blackouts.js";

type Props = {
  sessions: BlackoutSession[];
  onClose: () => void;
};

/** Shown when an absence request overlaps a required (blackout) session. Nothing was saved. */
export default function BlackoutBlockedDialog({ sessions, onClose }: Props) {
  return (
    <Dialog open={sessions.length > 0} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="shield-alert" className="h-5 w-5 text-red-600" />
            That's a blackout period
          </DialogTitle>
          <DialogDescription className="pt-1">
            Your request overlaps {sessions.length === 1 ? "a required session" : "required sessions"}, so it wasn't submitted. Your presence
            is mandatory. Please reschedule your other call or meeting.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5">
          {sessions.map((s) => (
            <li key={s.agenda_id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm font-semibold text-red-900">{s.title}</p>
              <p className="text-xs text-red-800/80">{blackoutWhen(s)}</p>
            </li>
          ))}
        </ul>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{BLACKOUT_REMINDER}</p>

        <DialogFooter>
          <Button onClick={onClose}>Got it, I'll reschedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
