/**
 * API Registry - Central export for all APIs.
 *
 * IMPORTANT: Use .js extension for imports (required for ESM compatibility)
 */

import SetupDatabase from './camp/setup-database.js';
import RegisterCamper from './camp/register-camper.js';
import GetCurrentCamper from './camp/get-current-camper.js';
import UpdateCamperProfile from './camp/update-camper-profile.js';
import GetPreworkStatus from './camp/get-prework-status.js';
import CompletePreworkItem from './camp/complete-prework-item.js';
import GetSessionBank from './camp/get-session-bank.js';
import CreateBankSession from './camp/create-bank-session.js';
import GetAgenda from './camp/get-agenda.js';
import ScheduleSession from './camp/schedule-session.js';
import RemoveAgendaItem from './camp/remove-agenda-item.js';
import GetCampConfig from './camp/get-camp-config.js';
import UpdateCampConfig from './camp/update-camp-config.js';
import GetTeams from './camp/get-teams.js';
import CreateTeam from './camp/create-team.js';
import AssignTeamMembers from './camp/assign-team-members.js';
import GetTeamHub from './camp/get-team-hub.js';
import AddHubItem from './camp/add-hub-item.js';
import UpdateHubItem from './camp/update-hub-item.js';
import GetLeaderboard from './camp/get-leaderboard.js';
import GetHubActivity from './camp/get-hub-activity.js';
import GetRegisteredCampers from './camp/get-registered-campers.js';
import MigrateTeamsTable from './camp/migrate-teams-table.js';
import GetExecutives from './camp/get-executives.js';
import CreateExecutive from './camp/create-executive.js';
import UpdateExecutive from './camp/update-executive.js';
import GetCohort from './camp/get-cohort.js';
import MigrateGoalColumns from './camp/migrate-goal-columns.js';
import ToggleGoalAchieved from './camp/toggle-goal-achieved.js';
import MigrateCheckinTables from './camp/migrate-checkin-tables.js';
import SeedWordBank from './camp/seed-word-bank.js';
import StartCheckIn from './camp/start-checkin.js';
import GetActiveCheckIn from './camp/get-active-checkin.js';
import SubmitCheckIn from './camp/submit-checkin.js';
import CloseCheckIn from './camp/close-checkin.js';
import GetCheckInHistory from './camp/get-checkin-history.js';
import RequestAbsence from './camp/request-absence.js';
import GetAbsenceRequests from './camp/get-absence-requests.js';
import MigrateCohorts from './camp/migrate-cohorts.js';
import GetCohorts from './camp/get-cohorts.js';
import CreateCohort from './camp/create-cohort.js';
import SetActiveCohort from './camp/set-active-cohort.js';
import GetActiveCohort from './camp/get-active-cohort.js';
import GetAdminCampers from './camp/get-admin-campers.js';
import GetAdminCamperDetail from './camp/get-admin-camper-detail.js';
import GetAdminTeams from './camp/get-admin-teams.js';
import MigrateRubrics from './camp/migrate-rubrics.js';
import GetRubricTemplates from './camp/get-rubric-templates.js';
import SubmitRubricScore from './camp/submit-rubric-score.js';
import GetRubricScores from './camp/get-rubric-scores.js';
import MigrateSurveys from './camp/migrate-surveys.js';
import CreateSurvey from './camp/create-survey.js';
import GetActiveSurvey from './camp/get-active-survey.js';
import SubmitSurvey from './camp/submit-survey.js';
import GetSurveyResults from './camp/get-survey-results.js';

const apis = {
  SetupDatabase,
  RegisterCamper,
  GetCurrentCamper,
  UpdateCamperProfile,
  GetPreworkStatus,
  CompletePreworkItem,
  GetSessionBank,
  CreateBankSession,
  GetAgenda,
  ScheduleSession,
  RemoveAgendaItem,
  GetCampConfig,
  UpdateCampConfig,
  GetTeams,
  CreateTeam,
  AssignTeamMembers,
  GetTeamHub,
  AddHubItem,
  UpdateHubItem,
  GetLeaderboard,
  GetHubActivity,
  GetRegisteredCampers,
  MigrateTeamsTable,
  GetExecutives,
  CreateExecutive,
  UpdateExecutive,
  GetCohort,
  MigrateGoalColumns,
  ToggleGoalAchieved,
  MigrateCheckinTables,
  SeedWordBank,
  StartCheckIn,
  GetActiveCheckIn,
  SubmitCheckIn,
  CloseCheckIn,
  GetCheckInHistory,
  RequestAbsence,
  GetAbsenceRequests,
  MigrateCohorts,
  GetCohorts,
  CreateCohort,
  SetActiveCohort,
  GetActiveCohort,
  GetAdminCampers,
  GetAdminCamperDetail,
  GetAdminTeams,
  MigrateRubrics,
  GetRubricTemplates,
  SubmitRubricScore,
  GetRubricScores,
  MigrateSurveys,
  CreateSurvey,
  GetActiveSurvey,
  SubmitSurvey,
  GetSurveyResults,
} as const;

export default apis;

/** Type for useApi inference - exported for client type-only imports */
export type ApiRegistry = typeof apis;
