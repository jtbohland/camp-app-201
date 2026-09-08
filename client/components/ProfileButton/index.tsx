import { useNavigate, useLocation } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Icon } from "@/components/ui/icon";

export default function ProfileButton() {
  const user = useSuperblocksUser();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = location.pathname === "/profile";
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <button
      onClick={() => navigate("/profile")}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      title="My Profile"
    >
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
        {initials}
      </div>
      <span className="hidden sm:inline font-medium">{user?.name?.split(" ")[0] ?? "Profile"}</span>
      <Icon icon="chevron-right" className="w-3.5 h-3.5 opacity-50" />
    </button>
  );
}
