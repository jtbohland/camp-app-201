import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData.js";
import TrailMap from "@/components/TrailMap/index.js";
import XPlanationTab from "@/components/XPlanationTab/index.js";

type TabId = "xplanation" | "trailmap";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "xplanation", label: "How Points Work", icon: "sparkles" },
  { id: "trailmap", label: "Trail Map", icon: "map" },
];

export default function BadgesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("xplanation");

  // Camp close awareness — lock badges until all leaderboards revealed
  const { data: closeStatus } = useApiData("GetCloseCampStatus", {}, { staleTime: 10000 });
  const campClosed = closeStatus?.camp_closed ?? false;
  const vpRevealed = closeStatus?.vp_revealed ?? false;
  const badgesLocked = campClosed && !vpRevealed;

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Header with tabs */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-6 px-6 pt-5 pb-0">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Icon icon="map" className="w-6 h-6 text-amber-400" />
              Camp Trail Map
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your journey through cAMP — earn badges, climb tiers, unlock awards
            </p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 px-6 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon icon={tab.icon as any} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === "xplanation" && <XPlanationTab />}
          {activeTab === "trailmap" && (
            badgesLocked ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center p-6">
                  <div className="text-4xl mb-3">🏕️</div>
                  <h3 className="font-bold text-lg text-foreground">Trail Map Locked</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    cAMP has closed! Final badges and standings are being revealed during the podium ceremony. Check back soon!
                  </p>
                </div>
              </div>
            ) : (
              <TrailMap />
            )
          )}
        </div>
      </div>
    </div>
  );
}
