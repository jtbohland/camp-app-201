import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onAdd: (name: string, email: string) => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddGuestJudgeDialog({ open, saving, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) { setName(""); setEmail(""); }
  }, [open]);

  const valid = name.trim().length > 0 && EMAIL_RE.test(email.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Guest Judge</DialogTitle>
          <DialogDescription>
            They get counselor access as soon as they sign in with this email, with no password needed. Their score is added
            to each team's total, and access ends when cAMP closes or a new cohort starts.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="judge-name">Name</Label>
            <Input id="judge-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Shah" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="judge-email">Work email</Label>
            <Input id="judge-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@amplitude.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || saving} onClick={() => onAdd(name.trim(), email.trim())}>
            {saving ? "Adding…" : "Add Judge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
