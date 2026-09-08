import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import RegistrationForm from "@/components/RegistrationForm";
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
  { icon: "users", label: "Teams", description: "Collaborate with your team", path: "/teams", color: "text-camp-green" },
  { icon: "trophy", label: "Leaderboard", description: "See the rankings", path: "/leaderboard", color: "text-camp-amber" },
  { icon: "presentation", label: "Presentations", description: "Group presentations", path: "/presentations", color: "text-purple-500" },
  { icon: "award", label: "Badges & XP", description: "Earn achievements", path: "/badges", color: "text-camp-green" },
];

export default function HomePage() {
  const user = useSuperblocksUser();
  const navigate = useNavigate();

  const { data, loading, refetch } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const handleRegistrationSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  if (loading) {
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

  if (!data?.isRegistered) {
    return <RegistrationForm userEmail={user?.email ?? ""} onSuccess={handleRegistrationSuccess} />;
  }

  const camper = data.camper;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl overflow-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/90 to-primary p-8 text-primary-foreground">
        <div className="absolute top-0 right-0 opacity-10">
          <Icon icon="mountain" className="w-48 h-48 -mt-8 -mr-8" />
        </div>
        <div className="relative">
          <p className="text-sm opacity-80 mb-1">Welcome back, cAMPer</p>
          <h1 className="text-3xl font-bold">
            {camper?.first_name} {camper?.last_name}
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Icon icon="flame" className="w-4 h-4 text-camp-amber" />
              <span className="text-sm font-semibold">{camper?.points ?? 0} points</span>
            </div>
            {!camper?.profile_completed && (
              <div className="flex items-center gap-2 bg-camp-amber/20 rounded-lg px-3 py-1.5">
                <Icon icon="alert-circle" className="w-4 h-4" />
                <span className="text-sm">Complete your profile to earn +15 pts</span>
              </div>
            )}
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
