import { NavLink } from "react-router";
import { Icon } from "@/components/ui/icon";
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
];

export default function AppSidebar() {
  return (
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
  );
}
