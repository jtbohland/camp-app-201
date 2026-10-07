import { useState, useMemo, useCallback } from "react";
import { queryClient } from "@superblocksteam/library";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import TeamsTab from "@/components/TeamsTab/index.js";
import CohortTab from "@/components/CohortTab/index.js";
import PastCampsGallery from "@/components/PastCampsGallery/index.js";
import TeamCultureHero from "@/components/TeamCultureHero/index.js";
import { toast } from "sonner";

type TabId = "cohort" | "teams" | "history";

// Cohort is always visible. Teams and Past cAMPs are controlled by counselors.
const tabs: { id: TabId; label: string; icon: string; gate?: string }[] = [
  { id: "cohort", label: "Cohort", icon: "contact" },
  { id: "teams", label: "Teams", icon: "users", gate: "teams" },
  { id: "history", label: "Past cAMPs", icon: "archive", gate: "past_camps" },
];

type Gate = { feature_key: string; label: string; is_locked: boolean };

export default function TeamsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("cohort");
  const { isAdmin } = useIsAdmin();
  const { data: gatesData } = useApiData("GetFeatureGates", {}, { refetchInterval: 30_000 });
  const { run: updateGate, loading: toggling } = useApi("UpdateFeatureGate");

  const gates = useMemo(() => {
    const map = new Map<string, Gate>();
    (gatesData?.gates ?? []).forEach((g: Gate) => map.set(g.feature_key, g));
    return map;
  }, [gatesData]);

  // Missing gate rows default to locked for cAMPers
  const isGateLocked = useCallback((key?: string) => (key ? gates.get(key)?.is_locked ?? true : false), [gates]);

  // cAMPers only see unlocked tabs; counselors see every tab with a lock toggle
  const visibleTabs = useMemo(
    () => (isAdmin ? tabs : tabs.filter((t) => !isGateLocked(t.gate))),
    [isAdmin, isGateLocked],
  );
  const currentTab = visibleTabs.some((t) => t.id === activeTab) ? activeTab : "cohort";

  const handleToggle = useCallback(async (key: string) => {
    const gate = gates.get(key);
    if (!gate) return;
    try {
      await updateGate({ feature_key: key, is_locked: !gate.is_locked, unlock_at: null });
      await queryClient.invalidateQueries("GetFeatureGates");
      toast.success(gate.is_locked ? `${gate.label} unlocked for cAMPers` : `${gate.label} locked for cAMPers`);
    } catch (e) {
      const message = typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: unknown }).message) : "Failed to update lock";
      toast.error(message);
    }
  }, [gates, updateGate]);

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Header with tabs */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-6 px-6 pt-5 pb-0">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Icon icon="users" className="w-6 h-6 text-primary" />
              Teams & Cohort
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your fellow cAMPers, teams, and past cohort inspiration
            </p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 px-6 mt-4">
          {visibleTabs.map((tab) => {
            const gate = tab.gate ? gates.get(tab.gate) : undefined;
            return (
              <div key={tab.id} className="flex items-center">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    currentTab === tab.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Icon icon={tab.icon as any} className="w-4 h-4" />
                  {tab.label}
                </button>
                {isAdmin && gate && (
                  <button
                    type="button"
                    onClick={() => handleToggle(gate.feature_key)}
                    disabled={toggling}
                    title={gate.is_locked ? "Locked for cAMPers. Click to unlock." : "Visible to cAMPers. Click to lock."}
                    aria-label={gate.is_locked ? `Unlock ${tab.label} for cAMPers` : `Lock ${tab.label} for cAMPers`}
                    className={`ml-0.5 mb-1 flex items-center justify-center w-6 h-6 rounded-md transition-colors disabled:opacity-50 ${
                      gate.is_locked ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    <Icon icon={gate.is_locked ? "lock" : "lock-open"} className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        {currentTab === "cohort" && <CohortTab />}
        {currentTab === "teams" && (
          <>
            <TeamCultureHero />
            <TeamsTab />
          </>
        )}
        {currentTab === "history" && <PastCampsGallery />}
      </div>
    </div>
  );
}
