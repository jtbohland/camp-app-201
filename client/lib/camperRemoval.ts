import { queryClient } from "@superblocksteam/library";

// Screens that list cAMPers and change when someone is removed or restored.
const ROSTER_APIS = [
  "GetAdminCampers",
  "GetRemovedCampers",
  "GetAdminTeams",
  "GetTeams",
  "GetLeaderboard",
  "GetRegisteredCampers",
  "GetNewHires",
  "GetTeamGeneratorPreview",
  "GetHubDashboard",
  "GetCohort",
  "GetCohortCampersForManager",
  "GetManagerDashboard",
  "GetFlightSummary",
];

export async function refreshRosterViews(): Promise<void> {
  await Promise.all(ROSTER_APIS.map((name) => queryClient.invalidateQueries(name)));
}
