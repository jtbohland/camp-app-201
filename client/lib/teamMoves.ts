import { queryClient } from "@superblocksteam/library";

// Every screen that shows who is on which team.
const TEAM_APIS = [
  "GetAdminCampers",
  "GetAdminTeams",
  "GetTeams",
  "GetTeamHub",
  "GetLeaderboard",
  "GetMyStanding",
  "GetHubDashboard",
  "GetTeamGeneratorPreview",
  "GetRegisteredCampers",
];

/** Refetch every team view after a counselor moves someone. */
export async function refreshTeamData(): Promise<void> {
  await Promise.all(TEAM_APIS.map((name) => queryClient.invalidateQueries(name)));
}

/** Select value used for "not on a team" (Radix Select can't use an empty string). */
export const UNASSIGNED = "none";
