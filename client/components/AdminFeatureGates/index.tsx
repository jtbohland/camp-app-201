import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { IconName } from "lucide-react/dynamic";

const GATE_ICONS: Record<string, IconName> = {
  journey: "map",
  agenda: "calendar",
  surveys: "clipboard-list",
  leaderboard: "trophy",
  presentations: "presentation",
  exec_qa: "hand-helping",
  badges: "award",
  graduation: "graduation-cap",
  timer: "timer",
  wheel_and_deal: "refresh-cw",
  teams: "users",
};

const GATE_DESCRIPTIONS: Record<string, string> = {
  journey: "Pre-work items, KBYG, and trail progress",
  agenda: "Schedule view for cAMPers",
  surveys: "Daily reflection surveys",
  leaderboard: "Points rankings and standings",
  presentations: "Group presentation details and rubrics",
  exec_qa: "Executive Q&A submission feed",
  badges: "Badges & XP achievement page",
  graduation: "Graduation summary and memories",
  timer: "Countdown timer for sessions",
  wheel_and_deal: "Wheel & Deal practice game",
  teams: "Team hub and collaboration",
};

type Gate = {
  feature_key: string;
  label: string;
  is_locked: boolean;
  unlock_at: string | null;
};

export default function AdminFeatureGates() {
  const { data, loading, fetching, refetch } = useApiData("GetFeatureGates", {});
  const { run: updateGate, loading: updating } = useApi("UpdateFeatureGate");

  const gates: Gate[] = data?.gates ?? [];

  const handleToggle = useCallback(async (gate: Gate) => {
    try {
      await updateGate({
        feature_key: gate.feature_key,
        is_locked: !gate.is_locked,
        unlock_at: null, // Clear scheduled unlock when manually toggling
      });
      toast.success(`${gate.label} ${gate.is_locked ? "unlocked" : "locked"}`);
      refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed: " + message);
    }
  }, [updateGate, refetch]);

  const handleScheduleUnlock = useCallback(async (gate: Gate, datetime: string) => {
    if (!datetime) return;
    try {
      await updateGate({
        feature_key: gate.feature_key,
        is_locked: true, // Keep locked, will auto-unlock at time
        unlock_at: new Date(datetime).toISOString(),
      });
      toast.success(`${gate.label} scheduled to unlock at ${new Date(datetime).toLocaleString()}`);
      refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed: " + message);
    }
  }, [updateGate, refetch]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-32 bg-white/10" /><Skeleton className="h-32 bg-white/10" /></div>;
  }

  return (
    <div className={`flex flex-col gap-4 ${fetching ? "opacity-70" : ""}`}>
      {/* Header */}
      <Card className="p-4 bg-white/10 border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Icon icon="lock" className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Feature Gates</h3>
            <p className="text-white/50 text-xs">Control which sections cAMPers can access. Locked features show a "coming soon" message.</p>
          </div>
        </div>
      </Card>

      {/* Gate toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gates.map((gate) => {
          const iconName = GATE_ICONS[gate.feature_key] ?? "lock";
          const desc = GATE_DESCRIPTIONS[gate.feature_key] ?? "";
          return (
            <Card key={gate.feature_key} className={`p-4 border transition-colors ${
              gate.is_locked ? "bg-red-950/20 border-red-500/20" : "bg-green-950/20 border-green-500/20"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                    gate.is_locked ? "bg-red-500/20" : "bg-green-500/20"
                  }`}>
                    <Icon icon={iconName} className={`w-4 h-4 ${gate.is_locked ? "text-red-400" : "text-green-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{gate.label}</span>
                      {gate.is_locked ? (
                        <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">LOCKED</span>
                      ) : (
                        <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">OPEN</span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                    {gate.unlock_at && gate.is_locked && (
                      <p className="text-amber-300 text-[10px] mt-1 flex items-center gap-1">
                        <Icon icon="clock" className="w-3 h-3" />
                        Auto-unlocks: {new Date(gate.unlock_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(gate)}
                    disabled={updating}
                    className={`h-8 text-xs ${gate.is_locked ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10"}`}
                  >
                    <Icon icon={gate.is_locked ? "lock-open" : "lock"} className="w-3.5 h-3.5 mr-1" />
                    {gate.is_locked ? "Unlock" : "Lock"}
                  </Button>
                  {gate.is_locked && (
                    <Input
                      type="datetime-local"
                      className="h-7 text-[10px] w-40 bg-white/5 border-white/10 text-white/70"
                      onChange={(e) => handleScheduleUnlock(gate, e.target.value)}
                      title="Schedule auto-unlock"
                    />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
