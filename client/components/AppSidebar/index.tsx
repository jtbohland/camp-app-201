import { useState, useMemo, useCallback } from "react";
import { queryClient, useSuperblocksUser } from "@superblocksteam/library";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import CheckInModal from "@/components/CheckInModal/index.js";
import SidebarNavItem from "@/components/SidebarNavItem/index.js";
import { toast } from "sonner";
import type { IconName } from "lucide-react/dynamic";

type NavItem = {
  icon: IconName;
  label: string;
  path: string;
  /** Feature gate key controlling visibility for cAMPers */
  gate?: string;
  adminOnly?: boolean;
};

const camperNavItems: NavItem[] = [
  { icon: "house", label: "Base Camp", path: "/" },
  { icon: "map", label: "Journey", path: "/journey", gate: "journey" },
  { icon: "calendar", label: "Agenda", path: "/agenda", gate: "agenda" },
  { icon: "users", label: "Teams & Rankings", path: "/teams" },
  { icon: "presentation", label: "Presentations", path: "/presentations", gate: "presentations" },
  { icon: "timer", label: "Timer", path: "/timer", gate: "timer" },
  { icon: "refresh-cw", label: "Wheel & Deal", path: "/wheel-and-deal", gate: "wheel_and_deal" },
  { icon: "clipboard-list", label: "Surveys", path: "/survey", gate: "surveys" },
  { icon: "award", label: "Badges & XP", path: "/badges", gate: "badges" },
  { icon: "graduation-cap", label: "Graduation", path: "/graduation", gate: "graduation" },
  { icon: "shield", label: "Counselor Hub", path: "/admin", adminOnly: true },
];

const managerNavItems: NavItem[] = [
  { icon: "binoculars", label: "My cAMPers", path: "/manager" },
  { icon: "calendar", label: "Agenda", path: "/agenda" },
  { icon: "trophy", label: "Leaderboard", path: "/leaderboard" },
];

type Gate = { feature_key: string; label: string; is_locked: boolean };

export default function AppSidebar() {
  const user = useSuperblocksUser();
  const [showCheckin, setShowCheckin] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const { isAdmin } = useIsAdmin();

  const { data: checkinData } = useApiData("GetActiveCheckIn", {}, { refetchInterval: 5000 });
  const checkinOpen = checkinData?.checkin_open ?? false;

  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { data: managerData } = useApiData("GetCurrentManager", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  // Refresh periodically so cAMPers see sections appear as soon as counselors unlock them
  const { data: gatesData } = useApiData("GetFeatureGates", {}, { refetchInterval: 30_000 });
  const { run: updateGate } = useApi("UpdateFeatureGate");

  const camper = camperData?.camper;
  const camperId = camper?.id ?? 0;
  const isCamper = camperData?.isRegistered === true;
  const profileDone = camper?.profile_completed === true;
  const isManager = managerData?.isManager === true;

  const gates = useMemo(() => {
    const map = new Map<string, Gate>();
    (gatesData?.gates ?? []).forEach((g: Gate) => map.set(g.feature_key, g));
    return map;
  }, [gatesData]);

  const navItems = useMemo(() => {
    if (isAdmin) return camperNavItems;
    if (isCamper && profileDone) {
      return camperNavItems.filter((item) => {
        if (item.adminOnly) return false;
        if (!item.gate) return true;
        const gate = gates.get(item.gate);
        return gate ? !gate.is_locked : true;
      });
    }
    if (isCamper) {
      // Registration not finished — profile only
      return [{ icon: "user" as IconName, label: "Complete Profile", path: "/profile" }];
    }
    if (isManager) return managerNavItems;
    return [{ icon: "house" as IconName, label: "Home", path: "/" }];
  }, [isAdmin, isCamper, profileDone, isManager, gates]);

  const handleToggleLock = useCallback(async (gateKey: string) => {
    const gate = gates.get(gateKey);
    if (!gate) return;
    setTogglingKey(gateKey);
    try {
      await updateGate({ feature_key: gateKey, is_locked: !gate.is_locked, unlock_at: null });
      await queryClient.invalidateQueries("GetFeatureGates");
      toast.success(gate.is_locked ? `${gate.label} unlocked for cAMPers` : `${gate.label} locked for cAMPers`);
    } catch (e) {
      const message = typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: unknown }).message) : "Failed to update lock";
      toast.error(message);
    } finally {
      setTogglingKey(null);
    }
  }, [gates, updateGate]);

  return (
    <>
      <aside className="flex flex-col w-[240px] h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Icon icon="mountain" className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wide">cAMP 201</span>
            <span className="text-xs text-sidebar-accent-foreground/60">
              {isAdmin ? "Counselor view" : isManager && !isCamper ? "Manager Portal" : "Amplitude"}
            </span>
          </div>
        </div>

        {/* Check-in Banner */}
        {checkinOpen && isCamper && profileDone && !isAdmin && (
          <button
            onClick={() => setShowCheckin(true)}
            className="mx-3 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-600/10 border border-green-600/30 text-green-600 text-sm font-semibold hover:bg-green-600/20 transition-colors animate-pulse"
          >
            <Icon icon="log-in" className="w-4 h-4" />
            <span>Check In Now!</span>
          </button>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const gate = isAdmin && item.gate ? gates.get(item.gate) : undefined;
            return (
              <SidebarNavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                locked={gate?.is_locked}
                toggling={togglingKey === item.gate}
                onToggleLock={gate ? () => handleToggleLock(gate.feature_key) : undefined}
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
            <Icon icon={isAdmin ? "lock" : "tent"} className="w-3.5 h-3.5" />
            <span>{isAdmin ? "Lock icons control what cAMPers see" : "The summit awaits"}</span>
          </div>
        </div>
      </aside>

      {/* Check-in Modal */}
      {showCheckin && camperId > 0 && (
        <CheckInModal camperId={camperId} onClose={() => setShowCheckin(false)} />
      )}
    </>
  );
}
