import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import RegistrationForm from "@/components/RegistrationForm";
import ManagerRegistrationForm from "@/components/ManagerRegistrationForm";
import AnnouncementsFeed from "@/components/AnnouncementsFeed/index.js";
import type { IconName } from "lucide-react/dynamic";

type QuickLink = {
  icon: IconName;
  label: string;
  description: string;
  path: string;
  color: string;
  badge?: string;
};

const quickLinks: QuickLink[] = [
  { icon: "map", label: "cAMP Journey", description: "Pre-work & know before you go", path: "/journey", color: "text-camp-amber", badge: "Pre-work" },
  { icon: "calendar", label: "Agenda", description: "See what's ahead", path: "/agenda", color: "text-camp-brown" },
  { icon: "users", label: "Teams & Rankings", description: "Collaborate with your team", path: "/teams", color: "text-camp-green" },
  { icon: "presentation", label: "Presentations", description: "Group presentations", path: "/presentations", color: "text-purple-500" },
  { icon: "award", label: "Badges & XP", description: "Earn achievements", path: "/badges", color: "text-camp-green" },
  { icon: "graduation-cap", label: "Graduation", description: "Memories & summary", path: "/graduation", color: "text-camp-amber" },
];

type RegistrationMode = "choose" | "camper" | "manager";

export default function HomePage() {
  const user = useSuperblocksUser();
  const navigate = useNavigate();
  const [regMode, setRegMode] = useState<RegistrationMode>("choose");

  const { data, loading, refetch } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  // Also check if user is a registered manager
  const { data: managerData, loading: loadingManager, refetch: refetchManager } = useApiData("GetCurrentManager", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const handleRegistrationSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleManagerRegistrationSuccess = useCallback(() => {
    refetchManager();
    navigate("/manager");
  }, [refetchManager, navigate]);

  if (loading || loadingManager) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // If not registered as camper or manager, show role selection then registration
  if (!data?.isRegistered && !managerData?.isManager) {
    if (regMode === "choose") {
      return (
        <div className="flex items-center justify-center min-h-full p-8">
          <div className="w-full max-w-lg flex flex-col items-center gap-8">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-camp-green/10 mb-4">
                <Icon icon="mountain" className="w-8 h-8 text-camp-green" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Welcome to cAMP 201</h1>
              <p className="text-sm text-muted-foreground mt-1">How are you joining us?</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              {/* cAMPer option */}
              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-all hover:border-camp-green/40 group text-center"
                onClick={() => setRegMode("camper")}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-camp-green/10 group-hover:bg-camp-green/20 transition-colors">
                    <Icon icon="tent" className="w-7 h-7 text-camp-green" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">I'm a cAMPer</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      I'm attending cAMP 201 as a new hire
                    </p>
                  </div>
                </div>
              </Card>

              {/* Manager option */}
              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-all hover:border-blue-500/40 group text-center"
                onClick={() => setRegMode("manager")}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <Icon icon="binoculars" className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">I'm a Manager</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      I'm here to track my new hire's progress
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    if (regMode === "manager") {
      return (
        <div className="relative">
          <button
            onClick={() => setRegMode("choose")}
            className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <Icon icon="arrow-left" className="w-4 h-4" />
            Back
          </button>
          <ManagerRegistrationForm userEmail={user?.email ?? ""} onSuccess={handleManagerRegistrationSuccess} />
        </div>
      );
    }

    // regMode === "camper"
    return (
      <div className="relative">
        <button
          onClick={() => setRegMode("choose")}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <Icon icon="arrow-left" className="w-4 h-4" />
          Back
        </button>
        <RegistrationForm userEmail={user?.email ?? ""} onSuccess={handleRegistrationSuccess} />
      </div>
    );
  }

  // If user is a manager but not a camper, redirect to manager dashboard
  if (!data?.isRegistered && managerData?.isManager) {
    navigate("/manager");
    return null;
  }

  const camper = data!.camper;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl overflow-auto">
      {/* Hero: Logo + Welcome — one combined card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2d4a27] via-[#3a5a32] to-[#2d4a27] p-8">
        {/* Faded background watermark */}
        <img
          src="/nomnom/camp201-logo-transparent.png"
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] object-contain opacity-[0.04] pointer-events-none"
        />
        <div className="relative flex flex-col items-center">
          <img
            src="/nomnom/camp201-logo-transparent.png"
            alt="cAMP 201"
            className="w-56 h-56 object-contain drop-shadow-2xl"
          />
          <div className="w-full mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Welcome back, cAMPer</p>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {camper?.first_name} {camper?.last_name}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                <Icon icon="flame" className="w-4 h-4 text-camp-amber" />
                <span className="text-sm font-bold text-white">{camper?.points ?? 0} pts</span>
              </div>
              {!camper?.profile_completed && (
                <div className="flex items-center gap-2 bg-camp-amber/20 rounded-lg px-3 py-1.5">
                  <Icon icon="alert-circle" className="w-4 h-4 text-camp-amber" />
                  <span className="text-xs text-camp-amber font-medium">Complete profile +15 pts</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout: Quick links + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Links - 2 cols */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon icon="compass" className="w-5 h-5 text-camp-green" />
            Trail Guide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Card
                key={link.path}
                className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-camp-green/30 group"
                onClick={() => navigate(link.path)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${link.color}`}>
                    <Icon icon={link.icon} className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors">{link.label}</span>
                      {link.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-camp-amber/15 text-camp-amber px-1.5 py-0.5 rounded-full">
                          {link.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5">{link.description}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Announcements - 1 col */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon icon="megaphone" className="w-5 h-5 text-amber-400" />
            Announcements
          </h2>
          <AnnouncementsFeed />
        </div>
      </div>
    </div>
  );
}
