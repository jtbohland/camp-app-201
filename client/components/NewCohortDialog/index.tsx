import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { refreshCohortData, errorMessage } from "@/lib/cohortRefresh";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCohortName: string | null;
  /** True when the current cohort is closed but not yet on the Legacy Wall. */
  legacyWallPending: boolean;
  onCreated?: () => void;
};

export default function NewCohortDialog({ open, onOpenChange, currentCohortName, legacyWallPending, onCreated }: Props) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { run: createCohort, loading } = useApi("CreateCohort");

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Give the cohort a name");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      toast.error("End date must be after the start date");
      return;
    }
    try {
      await createCohort({
        name: name.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        set_active: true,
      });
      await refreshCohortData();
      toast.success(`${name.trim()} is now the active cohort`);
      setName("");
      setStartDate("");
      setEndDate("");
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast.error("Couldn't start the cohort: " + errorMessage(error));
    }
  }, [name, startDate, endDate, createCohort, onOpenChange, onCreated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a new cohort</DialogTitle>
          <DialogDescription>
            The new cohort becomes active right away. cAMPers who register from now on join it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cohort-name">Cohort name</Label>
            <Input
              id="cohort-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. cAMP 201 — November 2026"
              maxLength={120}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cohort-start">First day</Label>
              <Input id="cohort-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cohort-end">Last day</Label>
              <Input id="cohort-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground space-y-1.5">
            <p className="font-semibold">What happens</p>
            <p className="flex gap-2"><Icon icon="rotate-ccw" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />Section locks go back to their starting state. Survey and agenda days unlock. Close-cAMP and podium results clear.</p>
            <p className="flex gap-2"><Icon icon="copy" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />Agenda, activities, Journey content, and program settings carry over as they are.</p>
            <p className="flex gap-2"><Icon icon="users" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600" />Counselors move to the new cohort. {currentCohortName ? `${currentCohortName}'s` : "The current"} cAMPers and teams stay in that cohort's history.</p>
          </div>

          {legacyWallPending && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
              <Icon icon="triangle-alert" className="w-4 h-4 shrink-0" />
              <span>
                {currentCohortName ?? "The current cohort"} hasn't been added to the Legacy Wall yet. Add it from <strong>Close cAMP</strong> first if you want it there.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? <Icon icon="loader-2" className="w-4 h-4 mr-1 animate-spin" /> : <Icon icon="tent" className="w-4 h-4 mr-1" />}
            Start cohort
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
