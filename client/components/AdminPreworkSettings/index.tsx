import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { formatPacific, defaultDeadlineFor } from "@/lib/preworkDeadline.js";

export default function AdminPreworkSettings() {
  const { data, loading, refetch } = useApiData("GetCampConfig", {});
  const { run: updateConfig, loading: saving } = useApi("UpdateCampConfig");

  const configs = (data?.config ?? []) as { key: string; value: string }[];
  const getVal = (key: string) => configs.find((c) => c.key === key)?.value ?? "";

  const [deadline, setDeadline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [bonus2Day, setBonus2Day] = useState("15");
  const [bonus1Day, setBonus1Day] = useState("10");
  const [penalty, setPenalty] = useState("10");

  useEffect(() => {
    if (configs.length > 0) {
      setDeadline(getVal("prework_deadline"));
      setStartDate(getVal("camp_start_date"));
      setBonus2Day(getVal("early_bird_2day_bonus") || "15");
      setBonus1Day(getVal("early_bird_1day_bonus") || "10");
      setPenalty(getVal("deadline_penalty_incomplete") || "10");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Blank deadline = cAMP start date at 9:00 AM PT.
  const effectiveDeadline = deadline || defaultDeadlineFor(startDate);

  const handleSaveAll = useCallback(async () => {
    try {
      // Start date first, so a blank deadline resolves to the new start date.
      await updateConfig({ key: "camp_start_date", value: startDate });
      await updateConfig({ key: "early_bird_2day_bonus", value: bonus2Day });
      await updateConfig({ key: "early_bird_1day_bonus", value: bonus1Day });
      await updateConfig({ key: "deadline_penalty_incomplete", value: penalty });
      await updateConfig({ key: "prework_deadline", value: deadline });
      toast.success("Settings saved!");
      refetch();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message) : String(err);
      toast.error("Error: " + message);
    }
  }, [deadline, startDate, bonus2Day, bonus1Day, penalty, updateConfig, refetch]);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-4">
      {/* cAMP Start Date */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="calendar" className="w-4 h-4 text-camp-green" />
          cAMP Start Date
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          First day of cAMP. Powers the live agenda tracker, day numbering, and session lock timing.
        </p>
        <div className="w-60">
          <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background border-border text-foreground" />
        </div>
        {startDate && (
          <p className="text-xs text-camp-green mt-2">
            cAMP starts: {new Date(startDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </Card>

      {/* Deadline */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="timer" className="w-4 h-4 text-amber-500" />
          Pre-Work &amp; Profile Deadline (Pacific time)
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Pre-work and profiles finished by this time earn points. After it, cAMPers can still finish them (they're
          required), but for 0 points. Leave blank to use the cAMP start date at 9:00 AM PT.
        </p>
        <div className="flex items-end gap-3">
          <div className="w-72">
            <Label className="text-xs text-muted-foreground mb-1 block">Deadline (PT)</Label>
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-background border-border text-foreground" />
          </div>
          {deadline && (
            <Button variant="ghost" size="sm" onClick={() => setDeadline("")}>
              Use default
            </Button>
          )}
        </div>
        <p className="text-xs text-amber-600 mt-2">
          {effectiveDeadline
            ? `Points end: ${formatPacific(effectiveDeadline)}${deadline ? "" : " (default)"}`
            : "Set the cAMP start date (or a deadline) so points know when to stop."}
        </p>
      </Card>

      {/* Early Bird Bonus */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="star" className="w-4 h-4 text-green-500" />
          Early Bird Bonus
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          A one-time bonus when a cAMPer finishes ALL pre-work early, based on when they finish the last task. Each
          cAMPer gets one or the other, never both.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Done 2+ days before the deadline</Label>
            <Input type="number" min={0} value={bonus2Day} onChange={(e) => setBonus2Day(e.target.value)} className="bg-background border-border text-foreground" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Done 1-2 days before the deadline</Label>
            <Input type="number" min={0} value={bonus1Day} onChange={(e) => setBonus1Day(e.target.value)} className="bg-background border-border text-foreground" />
          </div>
        </div>
      </Card>

      {/* Penalty */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="triangle-alert" className="w-4 h-4 text-red-500" />
          Missed Deadline Penalty
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          One deduction, applied once at the deadline, to each cAMPer who hasn't finished every pre-work task. Not per
          item.
        </p>
        <div className="w-48">
          <Label className="text-xs text-muted-foreground mb-1 block">Points deducted</Label>
          <Input type="number" min={0} value={penalty} onChange={(e) => setPenalty(e.target.value)} className="bg-background border-border text-foreground" />
        </div>
      </Card>

      <Button onClick={handleSaveAll} disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700">
        {saving ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}
