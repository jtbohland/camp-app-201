import { queryClient } from "@superblocksteam/library";

// APIs whose results depend on which cohort is active or on camp-wide state.
const COHORT_SCOPED_APIS = [
  "GetCohorts",
  "GetCloseCampStatus",
  "GetFeatureGates",
  "GetTeams",
  "GetLeaderboard",
  "GetRegisteredCampers",
  "GetNewHires",
  "GetHubDashboard",
  "GetAgendaDayLocks",
  "GetCounselorRotation",
  "GetFlightSummary",
  "GetPastCohorts",
  "GetViewCohort",
];

// Everything else that changes when a counselor switches which cohort they're viewing.
const VIEW_SCOPED_APIS = [
  ...COHORT_SCOPED_APIS,
  "GetWheelLeaderboard",
  "GetActiveWheelRound",
  "GetGraduationSummary",
  "GetGraduationStats",
  "GetSpiritVoteResults",
  "GetHackathonResults",
  "GetTeamVotes",
  "GetExecQuestions",
  "GetAnnouncements",
  "GetGallery",
  "GetMemories",
  "GetPeerFeedback",
  "GetSurveyResults",
  "GetDailySurveyResults",
  "GetRubricScores",
  "GetAdminCampers",
  "GetAdminTeams",
  "GetCohortCampersForManager",
  "GetManagerDashboard",
  "GetBingoCard",
];

/** Refetch everything that changes when a cohort is started, closed, or archived. */
export async function refreshCohortData(): Promise<void> {
  await Promise.all(COHORT_SCOPED_APIS.map((name) => queryClient.invalidateQueries(name)));
}

/** Refetch every screen after a counselor switches to (or back from) a past cohort. */
export async function refreshAllCohortViews(): Promise<void> {
  await Promise.all(VIEW_SCOPED_APIS.map((name) => queryClient.invalidateQueries(name)));
}

/** Formats a Postgres date ("2026-11-02" or ISO) as "Nov 2, 2026". */
export function formatCohortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Request failed";
}
