import { NavLink } from "react-router";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type Props = {
  icon: IconName;
  label: string;
  path: string;
  /** Admin view only: current lock state for this section (undefined = no lock) */
  locked?: boolean;
  toggling?: boolean;
  onToggleLock?: () => void;
  /** Unread count shown as a red pill (hidden when 0) */
  badge?: number;
  badgeTitle?: string;
};

export default function SidebarNavItem({ icon, label, path, locked, toggling, onToggleLock, badge, badgeTitle }: Props) {
  const hasLock = locked !== undefined && !!onToggleLock;

  return (
    <div className="group/nav relative flex items-center">
      <NavLink
        to={path}
        end={path === "/"}
        className={({ isActive }) =>
          `flex flex-1 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            hasLock ? "pr-10" : ""
          } ${
            isActive
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          }`
        }
      >
        <Icon icon={icon} className="w-4 h-4" />
        <span className={hasLock && locked ? "opacity-60" : ""}>{label}</span>
        {!!badge && badge > 0 && (
          <span
            className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center"
            title={badgeTitle}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </NavLink>

      {hasLock && (
        <button
          type="button"
          onClick={onToggleLock}
          disabled={toggling}
          aria-label={locked ? `Unlock ${label} for cAMPers` : `Lock ${label} for cAMPers`}
          title={locked ? "Locked for cAMPers. Click to unlock." : "Visible to cAMPers. Click to lock."}
          className={`absolute right-2 flex items-center justify-center w-7 h-7 rounded-md transition-colors disabled:opacity-50 ${
            locked
              ? "text-red-300 bg-red-500/15 hover:bg-red-500/30"
              : "text-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          <Icon icon={locked ? "lock" : "lock-open"} className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
