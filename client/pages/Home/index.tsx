import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import RegistrationForm from "@/components/RegistrationForm";
import type { IconName } from "lucide-react/dynamic";

type QuickLink = {
  icon: IconName;
  label: string;
  description: string;
  path: string;
  color: string;
};

const quickLinks: QuickLink[] = [
  { icon: "user", label: "Complete Profile", description: "Build your cAMP identity", path: "/profile", color: "text-camp-green" },
  { icon: "map", label: "cAMP Journey", description: "Track your progress", path: "/journey", color: "text-camp-amber" },
  { icon: "calendar", label: "Agenda", description: "See what's ahead", path: "/agenda", color: "text-camp-brown" },
  { icon: "users", label: "Team Hub", description: "Collaborate with your team", path: "/teams", color: "text-camp-green" },
  { icon: "trophy", label: "Leaderboard", description: "See the rankings", path: "/leaderboard", color: "text-camp-amber" },
  { icon: "mic", label: "Meet Executives", description: "Submit your questions", path: "/executives", color: "text-camp-brown" },
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

  // Not registered — show registration form
  if (!data?.isRegistered) {
    return <RegistrationForm userEmail={user?.email ?? ""} onSuccess={handleRegistrationSuccess} />;
  }

  const camper = data.camper;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl">
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

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="compass" className="w-5 h-5 text-camp-green" />
          Trail Guide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Card
              key={link.path}
              className="p-5 cursor-pointer hover:shadow-md transition-all hover:border-camp-green/30 group"
              onClick={() => navigate(link.path)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${link.color}`}>
                  <Icon icon={link.icon} className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm group-hover:text-primary transition-colors">{link.label}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{link.description}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Points Activity (placeholder) */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="flame" className="w-5 h-5 text-camp-amber" />
          Recent Activity
        </h2>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-camp-green" />
            <span>Registered for cAMP 201</span>
            <span className="ml-auto font-medium text-camp-green">+10 pts</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
