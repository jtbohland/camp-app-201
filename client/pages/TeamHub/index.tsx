import { useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";
import TeamHubView from "@/components/TeamHubView/index.js";
import { denseRanks } from "@/lib/rank";
import { errorText } from "@/lib/teamHub";
import { campDayNumber, type AgendaResource } from "@/lib/sessionResources.js";

export default function TeamHubPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const user = useSuperblocksUser();
  const teamIdNum = Number(teamId);

  const { data: teamsData, loading: teamsLoading } = useApiData("GetTeams", {});
  const { data: hub, loading: hubLoading, fetching, isError, error, refetch } = useApiData(
    "GetTeamHub",
    { team_id: teamIdNum },
    { enabled: Number.isFinite(teamIdNum) && teamIdNum > 0, retry: false },
  );

  // Today's session decks for the Home tab (server hides locked days from cAMPers).
  const { data: resourceData } = useApiData("GetAgendaResources", {}, { staleTime: 60_000 });
  const { data: configData } = useApiData("GetCampConfig", {});
  const today = useMemo(() => {
    const start = (configData?.config as Array<{ key: string; value: string }> | undefined)?.find((c) => c.key === "camp_start_date")?.value;
    return campDayNumber(start);
  }, [configData]);

  const teams = teamsData?.teams ?? [];
  const team = useMemo(() => teams.find((t) => t.id === teamIdNum), [teams, teamIdNum]);

  // Dense ranks by total points, same as the Teams page.
  const rank = useMemo(() => {
    const sorted = [...teams].sort((a, b) => b.total_points - a.total_points);
    const ranks = denseRanks(sorted.map((t) => t.total_points));
    const idx = sorted.findIndex((t) => t.id === teamIdNum);
    return idx >= 0 ? ranks[idx] : null;
  }, [teams, teamIdNum]);

  const company = (team?.assigned_company ?? null) as { name: string; emoji?: string; industry?: string } | null;

  if (hubLoading || teamsLoading) {
    return (
      <div className="flex h-full w-full flex-col gap-4 overflow-auto p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 md:col-span-2" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!team || isError || !hub) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-auto p-6 text-center">
        <Icon icon={isError ? "lock" : "search-x"} className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{isError ? errorText(error) : "Team not found"}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/teams")}>Back to Teams</Button>
      </div>
    );
  }

  const myName = user?.name ?? team.members.find((m) => m.id === hub.viewer.camper_id)?.first_name ?? "You";

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-card/50 px-6 py-4">
        <button onClick={() => navigate("/teams")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Teams
        </button>
        <TeamLogoBadge src={team.logo_url} name={team.name} color={team.color} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-foreground">{team.name} Hub</h1>
          <p className="text-xs text-muted-foreground">
            {team.members.length} members
            {company && ` · ${company.emoji ?? ""} ${company.name}`}
            {hub.viewer.is_counselor && !hub.viewer.is_member && " · Counselor view"}
          </p>
        </div>
      </div>

      <TeamHubView
        teamId={teamIdNum}
        hub={hub}
        members={team.members}
        company={company}
        rank={rank}
        totalTeams={teams.length}
        totalPoints={team.total_points}
        myName={myName}
        fetching={fetching}
        refetch={refetch}
        resources={(resourceData?.resources ?? []) as AgendaResource[]}
        today={today}
      />
    </div>
  );
}
