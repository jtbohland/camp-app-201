import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSuperblocksUser } from "@superblocksteam/library";
import HubSection from "@/components/HubSection/index.js";
import HubMissions from "@/components/HubMissions/index.js";
import { Icon } from "@/components/ui/icon";
import { DAY_NAMES } from "@/lib/presentationSchedule";

/** Icon per presentation_type. Falls back to a plain document icon. */
const PRES_ICONS: Record<string, string> = {
  team_presentation: "🏆",
  team_workshop: "🔍",
  hackathon: "🤖",
  bingo: "🎯",
  standard: "📋",
};

/** Build a SectionDef from a scheduled presentation so HubSection can render it. */
function presToSection(p: { id: number; title: string; presentation_type: string; day_number: number }) {
  return {
    key: `pres_${p.id}`,
    label: p.title,
    icon: PRES_ICONS[p.presentation_type] ?? "📄",
    description: `Workspace for "${p.title}"${p.day_number ? ` (Day ${p.day_number})` : ""}`,
  };
}

export default function TeamHubPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const user = useSuperblocksUser();
  const teamIdNum = Number(teamId);

  const { data: camperData } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { data: teamsData } = useApiData("GetTeams", {});
  const { data: hubData, loading: hubLoading, fetching, refetch } = useApiData("GetTeamHub", { team_id: teamIdNum });

  const team = useMemo(() => teamsData?.teams?.find((t) => t.id === teamIdNum), [teamsData, teamIdNum]);
  const { isAdmin } = useIsAdmin();
  const isTeamMember = team?.members?.some((m) => m.id === camperData?.camper?.id);
  const canContribute = isAdmin || isTeamMember;

  /**
   * Tabs = one per scheduled presentation, ordered by day then sort_order.
   * The "Missions" overview tab is always first.
   */
  const sections = useMemo(() => {
    const scheduled = hubData?.scheduled_presentations ?? [];
    return [...scheduled].sort((a, b) => {
      if (a.day_number !== b.day_number) return a.day_number - b.day_number;
      return a.sort_order - b.sort_order;
    });
  }, [hubData?.scheduled_presentations]);

  const [activeSection, setActiveSection] = useState<string>("missions");

  const activePresentation = useMemo(
    () => sections.find((s) => `pres_${s.id}` === activeSection) ?? null,
    [sections, activeSection],
  );

  const activeSectionDef = useMemo(
    () => (activePresentation ? presToSection(activePresentation) : null),
    [activePresentation],
  );

  const activeSectionItems = useMemo(
    () => (hubData?.items ?? []).filter((i) => i.section === activeSection),
    [hubData, activeSection],
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
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card/50 shrink-0">
        <button onClick={() => navigate("/teams")} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          ← Teams
        </button>
        {team && (
          <div className="flex items-center gap-3">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded-full bg-white object-contain" />
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

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 overflow-x-auto border-b border-border bg-muted/20 shrink-0">
        {/* Missions overview is always first */}
        <button
          onClick={() => setActiveSection("missions")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeSection === "missions"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>🎯</span>
          <span>Missions</span>
        </button>

        {/* One tab per scheduled presentation, grouped by day */}
        {sections.map((p, idx) => {
          const key = `pres_${p.id}`;
          const count = (hubData?.items ?? []).filter((i) => i.section === key).length;
          const isActive = activeSection === key;
          // Show a "Day N —" header when the day changes
          const prevDay = idx > 0 ? sections[idx - 1].day_number : null;
          const showDayDivider = p.day_number !== prevDay;

          return (
            <div key={key} className="flex items-center gap-1">
              {showDayDivider && idx > 0 && (
                <span className="text-[10px] text-muted-foreground/50 px-1 select-none">│</span>
              )}
              <button
                onClick={() => setActiveSection(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={`Day ${p.day_number} — ${DAY_NAMES[p.day_number] ?? ""}`}
              >
                <span>{PRES_ICONS[p.presentation_type] ?? "📄"}</span>
                <span className="max-w-[140px] truncate">{p.title}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-muted"}`}>
                    {count}
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {/* Show a placeholder when counselors haven't scheduled anything yet */}
        {sections.length === 0 && !hubLoading && (
          <span className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground/60 italic">
            <Icon icon="info" className="h-3.5 w-3.5" />
            Workspace tabs appear here when counselors schedule presentations
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeSection === "missions" ? (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                🎯 Active Missions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your team's presentations and exercises — tap "Full Brief" for complete details</p>
            </div>
            <HubMissions teamId={teamIdNum} camperId={camperData?.camper?.id ?? 0} />
          </div>
        ) : hubLoading ? (
          <div className="p-6 text-center text-muted-foreground">Loading hub content…</div>
        ) : activeSectionDef ? (
          <HubSection
            section={activeSectionDef}
            items={activeSectionItems}
            canContribute={canContribute ?? false}
            teamId={teamIdNum}
            camperId={camperData?.camper?.id ?? 0}
            onItemAdded={refetch}
            fetching={fetching}
          />
        ) : null}
      </div>
    </div>
  );
}
