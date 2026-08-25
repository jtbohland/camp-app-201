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
} as const;

export default apis;

/** Type for useApi inference - exported for client type-only imports */
export type ApiRegistry = typeof apis;
