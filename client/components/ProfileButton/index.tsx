import { useNavigate, useLocation } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData.js";
import { Icon } from "@/components/ui/icon";
import { useState, useRef, useEffect } from "react";

export default function ProfileButton() {
  const user = useSuperblocksUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const isActive = location.pathname === "/profile" || location.pathname === "/admin";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const handleClick = () => {
    if (isAdmin) {
      setShowMenu(!showMenu);
    } else {
      navigate("/profile");
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
        title={isAdmin ? "Profile & Hub" : "My Profile"}
      >
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {initials}
        </div>
        <span className="hidden sm:inline font-medium">{user?.name?.split(" ")[0] ?? "Profile"}</span>
        <Icon icon="chevron-right" className="w-3.5 h-3.5 opacity-50" />
      </button>

      {showMenu && isAdmin && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={() => { navigate("/profile"); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Icon icon="user" className="w-4 h-4" />
            My Profile
          </button>
          <button
            onClick={() => { navigate("/admin"); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Icon icon="shield" className="w-4 h-4" />
            Counselor Hub
          </button>
        </div>
      )}
    </div>
  );
}
