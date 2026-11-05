import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

type Approval = { type: "penalty" | "emergency"; password: string };

type Props = {
  open: boolean;
  limit: number;
  submitting: boolean;
  onClose: () => void;
  /** Resolves true when the absence was saved. */
  onCounselorApprove: (approval: Approval) => Promise<boolean>;
};

/** Shown on a 4th+ absence: not approved, unless a counselor approves it in person with the password. */
export default function AbsenceLimitDialog({ open, limit, submitting, onClose, onCounselorApprove }: Props) {
  const [step, setStep] = useState<"limit" | "counselor">("limit");
  const [type, setType] = useState<Approval["type"] | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setStep("limit");
      setType(null);
      setPassword("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {step === "limit" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon icon="calendar-x" className="h-5 w-5 text-red-600" />
                You've used all {limit} excused absences
              </DialogTitle>
              <DialogDescription className="pt-1">
                This absence wasn't approved. If something truly can't wait, find a counselor.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setStep("counselor")}>
                <Icon icon="shield" className="mr-1.5 h-4 w-4" />
                Counselor approval
              </Button>
              <Button onClick={onClose}>Got it</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon icon="shield" className="h-5 w-5 text-primary" />
                Counselor approval
              </DialogTitle>
              <DialogDescription className="pt-1">Counselor: choose how to approve, then enter the counselor password.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("penalty")}
                className={`rounded-lg border p-3 text-left transition-colors ${type === "penalty" ? "border-red-400 bg-red-50 ring-2 ring-red-200" : "border-border hover:bg-muted/50"}`}
              >
                <p className="text-sm font-semibold text-foreground">Approve (−1 pt)</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Costs 1 point at Close cAMP</p>
              </button>
              <button
                type="button"
                onClick={() => setType("emergency")}
                className={`rounded-lg border p-3 text-left transition-colors ${type === "emergency" ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200" : "border-border hover:bg-muted/50"}`}
              >
                <p className="text-sm font-semibold text-foreground">Approve, emergency</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">No penalty</p>
              </button>
            </div>
            <Input
              type="password"
              placeholder="Counselor password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && type && password) void onCounselorApprove({ type, password });
              }}
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setStep("limit")} disabled={submitting}>
                Back
              </Button>
              <Button onClick={() => type && onCounselorApprove({ type, password })} disabled={!type || !password || submitting}>
                {submitting ? "Approving…" : "Approve absence"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
