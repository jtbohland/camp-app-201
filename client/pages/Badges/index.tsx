import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import BadgesTab from "@/components/BadgesTab/index.js";
import XPlanationTab from "@/components/XPlanationTab/index.js";

type TabId = "badges" | "xplanation";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "badges", label: "My Badges", icon: "award" },
  { id: "xplanation", label: "How Points Work", icon: "sparkles" },
];

export default function BadgesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("badges");

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Header with tabs */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-6 px-6 pt-5 pb-0">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Icon icon="award" className="w-6 h-6 text-amber-400" />
              Badges & XP
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Earn achievements and understand how points work
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
        {activeTab === "badges" && <BadgesTab />}
        {activeTab === "xplanation" && <XPlanationTab />}
      </div>
    </div>
  );
}
