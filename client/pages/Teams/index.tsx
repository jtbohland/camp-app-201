import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import TeamsTab from "@/components/TeamsTab/index.js";
import CohortTab from "@/components/CohortTab/index.js";
import PastCampsGallery from "@/components/PastCampsGallery/index.js";
import TeamCultureHero from "@/components/TeamCultureHero/index.js";

type TabId = "cohort" | "teams" | "history";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "cohort", label: "Cohort", icon: "contact" },
  { id: "teams", label: "Teams", icon: "users" },
  { id: "history", label: "Past cAMPs", icon: "archive" },
];

export default function TeamsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("cohort");
  const user = useSuperblocksUser();

  // Check the "teams" gate for the Teams tab
  const { data: gatesData } = useApiData("GetFeatureGates", {});
  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email, staleTime: 60_000 });

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const teamsGate = (gatesData?.gates ?? []).find((g: any) => g.feature_key === "teams");
  const teamsLocked = isAdmin ? false : (teamsGate ? teamsGate.is_locked : true);

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
          <img src="/nomnom/flag.png" alt="" className="w-14 h-14 object-contain opacity-60" />
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 px-6 mt-4">
          {tabs.map((tab) => {
            const isLocked = tab.id === "teams" && teamsLocked;
            return (
              <button
                key={tab.id}
                onClick={() => !isLocked && setActiveTab(tab.id)}
                disabled={isLocked}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : isLocked
                      ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Icon icon={isLocked ? "lock" as any : tab.icon as any} className="w-4 h-4" />
                {tab.label}
                {isLocked && <span className="text-[10px]">(locked)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        {activeTab === "cohort" && <CohortTab />}
        {activeTab === "teams" && !teamsLocked && (
          <>
            <TeamCultureHero />
            <TeamsTab />
          </>
        )}
        {activeTab === "history" && <PastCampsGallery />}
      </div>
    </div>
  );
}
