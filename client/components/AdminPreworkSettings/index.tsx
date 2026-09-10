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

export default function AdminPreworkSettings() {
  const { data, loading, refetch } = useApiData("GetCampConfig", {});
  const { run: updateConfig, loading: saving } = useApi("UpdateCampConfig");

  const configs = (data?.config ?? []) as any[];
  const getVal = (key: string) => configs.find((c: any) => c.key === key)?.value ?? "";

  const [deadline, setDeadline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [bonus2Day, setBonus2Day] = useState("15");
  const [bonus1Day, setBonus1Day] = useState("10");
  const [penaltyPerItem, setPenaltyPerItem] = useState("10");

  useEffect(() => {
    if (configs.length > 0) {
      setDeadline(getVal("prework_deadline"));
      setStartDate(getVal("camp_start_date"));
      setBonus2Day(getVal("early_bird_2day_bonus") || "15");
      setBonus1Day(getVal("early_bird_1day_bonus") || "10");
      setPenaltyPerItem(getVal("deadline_penalty_per_item") || "10");
    }
  }, [data]);

  const handleSave = useCallback(async (key: string, value: string) => {
    try {
      await updateConfig({ key, value });
      toast.success(`Updated ${key}`);
      refetch();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message) : String(err);
      toast.error("Error: " + message);
    }
  }, [updateConfig, refetch]);

  const handleSaveAll = useCallback(async () => {
    try {
      await updateConfig({ key: "prework_deadline", value: deadline });
      await updateConfig({ key: "camp_start_date", value: startDate });
      await updateConfig({ key: "early_bird_2day_bonus", value: bonus2Day });
      await updateConfig({ key: "early_bird_1day_bonus", value: bonus1Day });
      await updateConfig({ key: "deadline_penalty_per_item", value: penaltyPerItem });
      toast.success("All settings saved!");
      refetch();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message) : String(err);
      toast.error("Error: " + message);
    }
  }, [deadline, startDate, bonus2Day, bonus1Day, penaltyPerItem, updateConfig, refetch]);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-4">
      {/* Deadline */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="timer" className="w-4 h-4 text-amber-400" />
          Pre-Work Deadline
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Set the date and time all pre-work must be completed by. Campers see a countdown timer.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Deadline (datetime)</Label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
        </div>
        {deadline && (
          <p className="text-xs text-amber-400 mt-2">
            Deadline set: {new Date(deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </Card>

      {/* cAMP Start Date */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="calendar" className="w-4 h-4 text-camp-green" />
          cAMP Start Date
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          First day of cAMP. Powers the live agenda tracker, day numbering, and session lock timing.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
        </div>
        {startDate && (
          <p className="text-xs text-camp-green mt-2">
            cAMP starts: {new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </Card>

      {/* Early Bird Bonus */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="star" className="w-4 h-4 text-green-400" />
          Early Bird Bonus Points
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Bonus points for completing ALL pre-work early. Only awarded if everything is done.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">2+ days early bonus</Label>
            <Input
              type="number"
              value={bonus2Day}
              onChange={(e) => setBonus2Day(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">1-2 days early bonus</Label>
            <Input
              type="number"
              value={bonus1Day}
              onChange={(e) => setBonus1Day(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
        </div>
      </Card>

      {/* Penalty */}
      <Card className="p-5 bg-muted/50 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="alert-triangle" className="w-4 h-4 text-red-400" />
          Missed Deadline Penalty
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Negative points per incomplete item when the deadline passes.
        </p>
        <div className="w-48">
          <Label className="text-xs text-muted-foreground mb-1 block">Penalty per incomplete item</Label>
          <Input
            type="number"
            value={penaltyPerItem}
            onChange={(e) => setPenaltyPerItem(e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>
      </Card>

      <Button onClick={handleSaveAll} disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700">
        {saving ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}
