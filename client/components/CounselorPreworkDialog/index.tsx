import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { errorMessage } from "@/lib/cohortRefresh";
import { previewPreworkPoints, refreshPreworkViews, todayPacific } from "@/lib/counselorPrework.js";
import PreworkItemList from "./PreworkItemList.js";
import PreworkConfirmSummary from "./PreworkConfirmSummary.js";

type Props = {
  camperId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Counselor action: mark a cAMPer's unfinished pre-work complete on a chosen day. */
export default function CounselorPreworkDialog({ camperId, open, onOpenChange }: Props) {
  const { data, loading, isError, error } = useApiData(
    "GetCamperPreworkChecklist",
    { camper_id: camperId },
    { enabled: open, staleTime: 0 }
  );
  const { run: complete, loading: saving } = useApi("CounselorCompletePrework");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(todayPacific());
  const [confirming, setConfirming] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  const openItems = useMemo(() => items.filter((i) => !i.completed), [items]);

  // Every unfinished item checked, today's date, each time the dialog opens or the list changes.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(openItems.map((i) => i.key)));
    setConfirming(false);
  }, [open, openItems]);
  useEffect(() => {
    if (open) setDate(todayPacific());
  }, [open]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const preview = useMemo(
    () =>
      previewPreworkPoints({
        date,
        selectedCount: selected.size,
        existingCompletedAt: items.filter((i) => i.completed).map((i) => i.completedAt),
        openCount: openItems.length,
        deadline: data?.deadline ?? null,
        pointsPerItem: data?.pointsPerItem ?? 5,
        earlyBird2Day: data?.earlyBird2DayBonus ?? 0,
        earlyBird1Day: data?.earlyBird1DayBonus ?? 0,
        earlyBirdGiven: data?.earlyBirdGiven ?? false,
      }),
    [date, selected, items, openItems, data]
  );

  const handleSave = useCallback(async () => {
    try {
      const res = await complete({ camper_id: camperId, items: [...selected], completed_on: date });
      await refreshPreworkViews();
      const pts = (res?.pointsAwarded ?? 0) + (res?.earlyBirdPoints ?? 0) + (res?.penaltyReversed ?? 0);
      const parts = [`${res?.itemsMarked ?? 0} item${res?.itemsMarked === 1 ? "" : "s"} marked complete`];
      if (pts > 0) parts.push(`+${pts} pts`);
      if ((res?.earlyBirdPoints ?? 0) > 0) parts.push(`incl. +${res!.earlyBirdPoints} early bird`);
      toast.success(parts.join(" · "));
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't mark pre-work complete: " + errorMessage(e));
    }
  }, [complete, camperId, selected, date, onOpenChange]);

  const titles = openItems.filter((i) => selected.has(i.key)).map((i) => i.title);
  const blocked = data?.blockedReason ?? null;
  const allDone = !!data && openItems.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{confirming ? "Confirm pre-work completion" : "Mark pre-work complete"}</DialogTitle>
          <DialogDescription>
            {confirming
              ? "Nothing is saved until you confirm."
              : `For ${data?.camperName ?? "this cAMPer"}. Points follow the normal rules for the date you pick.`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 rounded" />)}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Couldn't load pre-work: {errorMessage(error)}</p>
        ) : blocked ? (
          <p className="text-sm text-muted-foreground">{blocked}</p>
        ) : allDone ? (
          <p className="text-sm text-emerald-700">All pre-work is already complete.</p>
        ) : confirming ? (
          <PreworkConfirmSummary
            camperName={data?.camperName ?? "this cAMPer"}
            titles={titles}
            date={date}
            preview={preview}
            penaltyApplied={data?.penaltyApplied ?? false}
          />
        ) : (
          <PreworkItemList items={items} selected={selected} onToggle={toggle} date={date} onDateChange={setDate} />
        )}

        <DialogFooter>
          {confirming ? (
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>Back</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Yes, mark complete"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => setConfirming(true)}
                disabled={loading || !!blocked || allDone || selected.size === 0 || !date || date > todayPacific()}
              >
                Review {selected.size} item{selected.size === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
