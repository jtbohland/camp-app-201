import { useState } from "react";
import { NavLink } from "react-router";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import CheckInModal from "@/components/CheckInModal/index.js";
import type { IconName } from "lucide-react/dynamic";

type NavItem = {
  icon: IconName;
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  { icon: "house", label: "Base Camp", path: "/" },
  { icon: "user", label: "My Profile", path: "/profile" },
  { icon: "map", label: "Journey", path: "/journey" },
  { icon: "calendar", label: "Agenda", path: "/agenda" },
  { icon: "users", label: "Teams", path: "/teams" },
  { icon: "trophy", label: "Leaderboard", path: "/leaderboard" },
  { icon: "mic", label: "Executives", path: "/executives" },
  { icon: "contact", label: "Cohort", path: "/cohort" },
  { icon: "sparkles", label: "XPlanation", path: "/xplanation" },
  { icon: "timer", label: "Timer", path: "/timer" },
  { icon: "shield", label: "Counselor Hub", path: "/admin" },
];

export default function AppSidebar() {
  const user = useSuperblocksUser();
  const [showCheckin, setShowCheckin] = useState(false);

  // Poll for active check-in session
  const { data: checkinData } = useApiData("GetActiveCheckIn", {}, { refetchInterval: 5000 });
  const checkinOpen = checkinData?.checkin_open ?? false;

  // Get camper ID for check-in modal
  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

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
            <span className="text-xs text-sidebar-accent-foreground/60">Amplitude</span>
          </div>
        </div>

        {/* Check-in Banner */}
        {checkinOpen && !isAdmin && (
          <button
            onClick={() => setShowCheckin(true)}
            className="mx-3 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-600/10 border border-green-600/30 text-green-600 text-sm font-semibold hover:bg-green-600/20 transition-colors animate-pulse"
          >
            <Icon icon="log-in" className="w-4 h-4" />
            <span>Check In Now!</span>
          </button>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`
              }
            >
              <Icon icon={item.icon} className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
            <Icon icon="tent" className="w-3.5 h-3.5" />
            <span>The summit awaits</span>
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
