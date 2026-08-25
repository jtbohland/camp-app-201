import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import HubSection from "@/components/HubSection/index.js";

const SECTIONS = [
  { key: "pillars", label: "Amplitude 3 Pillars", icon: "🏛️", description: "Use cases & value propositions" },
  { key: "hackathon", label: "AI Hackathon", icon: "🤖", description: "Ideas, code snippets & research" },
  { key: "research", label: "Account Research", icon: "🔍", description: "Customer insights & findings" },
  { key: "value_mapping", label: "Value Mapping", icon: "🗺️", description: "Mapping value to customer needs" },
  { key: "ebr", label: "EBR Prep", icon: "📊", description: "Executive Business Review materials" },
];

export default function TeamHubPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const user = useSuperblocksUser();
  const teamIdNum = Number(teamId);

  const { data: camperData } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { data: teamsData } = useApiData("GetTeams", {});
  const { data: hubData, loading: hubLoading, fetching, refetch } = useApiData("GetTeamHub", { team_id: teamIdNum });

  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);

  const team = useMemo(() => teamsData?.teams?.find((t) => t.id === teamIdNum), [teamsData, teamIdNum]);
  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const isTeamMember = team?.members?.some((m) => m.id === camperData?.camper?.id);
  const canContribute = isAdmin || isTeamMember;

  const sectionItems = useMemo(
    () => (hubData?.items ?? []).filter((item) => item.section === activeSection),
    [hubData, activeSection]
  );

  if (!team && !hubLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-muted-foreground">Team not found</p>
        <button onClick={() => navigate("/teams")} className="text-primary underline text-sm">
          Back to Teams
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Hub Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card/50 shrink-0">
        <button onClick={() => navigate("/teams")} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          ← Teams
        </button>
        {team && (
          <div className="flex items-center gap-3">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: team.color || "#2d6a4f" }}
              >
                {team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">{team.name} Hub</h1>
              <p className="text-xs text-muted-foreground">{team.members.length} members • Living workspace</p>
            </div>
          </div>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 px-6 py-3 overflow-x-auto border-b border-border bg-muted/20 shrink-0">
        {SECTIONS.map((section) => {
          const count = (hubData?.items ?? []).filter((i) => i.section === section.key).length;
          return (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === section.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSection === section.key ? "bg-white/20" : "bg-muted"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-auto">
        {hubLoading ? (
          <div className="p-6 text-center text-muted-foreground">Loading hub content…</div>
        ) : (
          <HubSection
            section={SECTIONS.find((s) => s.key === activeSection)!}
            items={sectionItems}
            canContribute={canContribute ?? false}
            teamId={teamIdNum}
            camperId={camperData?.camper?.id ?? 0}
            onItemAdded={refetch}
            fetching={fetching}
          />
        )}
      </div>
    </div>
  );
}
