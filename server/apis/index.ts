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
import MigrateAgendaResources from './camp/migrate-agenda-resources.js';
import AddAgendaResource from './camp/add-agenda-resource.js';
import GetAgendaResources from './camp/get-agenda-resources.js';
import MigrateBadges from './camp/migrate-badges.js';
import GetBadges from './camp/get-badges.js';
import AwardBadge from './camp/award-badge.js';
import MigrateAnnouncements from './camp/migrate-announcements.js';
import GetAnnouncements from './camp/get-announcements.js';
import CreateAnnouncement from './camp/create-announcement.js';
import MigrateGallery from './camp/migrate-gallery.js';
import GetGallery from './camp/get-gallery.js';
import AddGalleryPhoto from './camp/add-gallery-photo.js';
import GetGraduationSummary from './camp/get-graduation-summary.js';
import MigrateTeamHistory from './camp/migrate-team-history.js';
import GetTeamHistory from './camp/get-team-history.js';
import AddTeamHistory from './camp/add-team-history.js';
import MigratePeerFeedback from './camp/migrate-peer-feedback.js';
import GetPeerFeedback from './camp/get-peer-feedback.js';
import SubmitPeerFeedback from './camp/submit-peer-feedback.js';
import MigratePresentations from './camp/migrate-presentations.js';
import GetPresentations from './camp/get-presentations.js';
import CreatePresentation from './camp/create-presentation.js';
import GetPresentationDetail from './camp/get-presentation-detail.js';
import SubmitPresentationFeedback from './camp/submit-presentation-feedback.js';
import MigrateJourneyContent from './camp/migrate-journey-content.js';
import GetJourneyContent from './camp/get-journey-content.js';
import UpdateJourneyContent from './camp/update-journey-content.js';
import TrackLinkClick from './camp/track-link-click.js';
import MigrateIceBreaker from './camp/migrate-ice-breaker.js';
import MigrateFlightAndDeadline from './camp/migrate-flight-deadline.js';
import UpdateFlightInfo from './camp/update-flight-info.js';
import GetFlightSummary from './camp/get-flight-summary.js';
import UpdateBankSession from './camp/update-bank-session.js';
import RemoveBankSession from './camp/remove-bank-session.js';
import ClearDaySchedule from './camp/clear-day-schedule.js';
import MoveAgendaItem from './camp/move-agenda-item.js';
import SeedSessionBank from './camp/seed-session-bank.js';
import MigrateQAFeed from './camp/migrate-qa-feed.js';
import GetExecQuestions from './camp/get-exec-questions.js';
import SubmitExecQuestion from './camp/submit-exec-question.js';
import VoteExecQuestion from './camp/vote-exec-question.js';
import MigrateManagers from './camp/migrate-managers.js';
import RegisterManager from './camp/register-manager.js';
import GetCurrentManager from './camp/get-current-manager.js';
import GetCohortCampersForManager from './camp/get-cohort-campers.js';
import GetManagerDashboard from './camp/get-manager-dashboard.js';
import AddManagerComment from './camp/add-manager-comment.js';
import GetAdminManagerOverview from './camp/get-admin-manager-overview.js';
import MigrateDailySurveys from './camp/migrate-daily-surveys.js';
import GetDailySurvey from './camp/get-daily-survey.js';
import SubmitDailySurvey from './camp/submit-daily-survey.js';
import GetDailySurveyResults from './camp/get-daily-survey-results.js';
import MigrateFeatureGates from './camp/migrate-feature-gates.js';
import GetFeatureGates from './camp/get-feature-gates.js';
import UpdateFeatureGate from './camp/update-feature-gate.js';
import SeedPastCohorts from './camp/seed-past-cohorts.js';
import GetPastCohorts from './camp/get-past-cohorts.js';
import GenerateTeamLogo from './camp/generate-team-logo.js';
import MigrateLogoVotes from './camp/migrate-logo-votes.js';
import GetTeamVotes from './camp/get-team-votes.js';
import SubmitTeamVote from './camp/submit-team-vote.js';
import AutoGenerateTeams from './camp/auto-generate-teams.js';
import UpdateCounselorProfile from './camp/update-counselor-profile.js';
import MigrateCounselorVisibility from './camp/migrate-counselor-visibility.js';
import ToggleCounselorVisibility from './camp/toggle-counselor-visibility.js';
import UpdateTeamDesign from './camp/update-team-design.js';
import MigratePresentationsV2 from './camp/migrate-presentations-v2.js';
import UpdatePresentation from './camp/update-presentation.js';
import MigratePresentationWorkspace from './camp/migrate-presentation-workspace.js';
import GetPresentationResponses from './camp/get-presentation-responses.js';
import SavePresentationResponses from './camp/save-presentation-responses.js';
import MigrateBingo from './camp/migrate-bingo.js';
import GetBingoCard from './camp/get-bingo-card.js';
import SubmitBingoGuess from './camp/submit-bingo-guess.js';
import ScoreTeamPresentation from './camp/score-team-presentation.js';
import GetRubricTemplate from './camp/get-rubric-template.js';
import GetPointsBreakdown from './camp/get-points-breakdown.js';
import MigratePointsCategory from './camp/migrate-points-category.js';
import MigrateCompanyAssignment from './camp/migrate-company-assignment.js';
import AssignCompanyToTeam from './camp/assign-company-to-team.js';
import GetTeamWorkspace from './camp/get-team-workspace.js';
import SaveTeamWorkspace from './camp/save-team-workspace.js';
import MigrateHackathon from './camp/migrate-hackathon.js';
import SaveHackathonSubmission from './camp/save-hackathon-submission.js';
import GetHackathonResults from './camp/get-hackathon-results.js';
import SubmitHackathonVote from './camp/submit-hackathon-vote.js';
import MigrateEBR from './camp/migrate-ebr.js';
import GetEBRRoleAssignments from './camp/get-ebr-role-assignments.js';
import SaveEBRRoleAssignment from './camp/save-ebr-role-assignment.js';
import ToggleScoresRevealed from './camp/toggle-scores-revealed.js';
import ToggleAgendaDayLock from './camp/toggle-agenda-day-lock.js';
import GetAgendaDayLocks from './camp/get-agenda-day-locks.js';
import RandomizePresentationOrder from './camp/randomize-presentation-order.js';
import GetPresentationOrder from './camp/get-presentation-order.js';
import ClearPresentationOrder from './camp/clear-presentation-order.js';
import QuickAwardPoints from './camp/quick-award-points.js';
import MigratePreworkSubmissions from './camp/migrate-prework-submissions.js';
import SubmitPreworkValidation from './camp/submit-prework-validation.js';
import TogglePresentationLock from './camp/toggle-presentation-lock.js';
import GetHubDashboard from './camp/get-hub-dashboard.js';
import MigrateNewHires from './camp/migrate-new-hires.js';
import UploadNewHireList from './camp/upload-new-hire-list.js';
import GetNewHires from './camp/get-new-hires.js';
import UpdateNewHireStatus from './camp/update-new-hire-status.js';
import SetupWheelTables from './camp/setup-wheel-tables.js';
import CreateWheelRound from './camp/create-wheel-round.js';
import GetActiveWheelRound from './camp/get-active-wheel-round.js';
import SubmitWheelScore from './camp/submit-wheel-score.js';
import CloseWheelScoring from './camp/close-wheel-scoring.js';
import GetWheelLeaderboard from './camp/get-wheel-leaderboard.js';
import SetupSpiritVoteTable from './camp/setup-spirit-vote-table.js';
import SubmitSpiritVote from './camp/submit-spirit-vote.js';
import GetSpiritVoteResults from './camp/get-spirit-vote-results.js';

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
  MigrateAgendaResources,
  AddAgendaResource,
  GetAgendaResources,
  MigrateBadges,
  GetBadges,
  AwardBadge,
  MigrateAnnouncements,
  GetAnnouncements,
  CreateAnnouncement,
  MigrateGallery,
  GetGallery,
  AddGalleryPhoto,
  GetGraduationSummary,
  MigrateTeamHistory,
  GetTeamHistory,
  AddTeamHistory,
  MigratePeerFeedback,
  GetPeerFeedback,
  SubmitPeerFeedback,
  MigratePresentations,
  GetPresentations,
  CreatePresentation,
  GetPresentationDetail,
  SubmitPresentationFeedback,
  MigrateJourneyContent,
  GetJourneyContent,
  UpdateJourneyContent,
  TrackLinkClick,
  MigrateIceBreaker,
  MigrateFlightAndDeadline,
  UpdateFlightInfo,
  GetFlightSummary,
  UpdateBankSession,
  RemoveBankSession,
  ClearDaySchedule,
  MoveAgendaItem,
  SeedSessionBank,
  MigrateQAFeed,
  GetExecQuestions,
  SubmitExecQuestion,
  VoteExecQuestion,
  MigrateManagers,
  RegisterManager,
  GetCurrentManager,
  GetCohortCampersForManager,
  GetManagerDashboard,
  AddManagerComment,
  GetAdminManagerOverview,
  MigrateDailySurveys,
  GetDailySurvey,
  SubmitDailySurvey,
  GetDailySurveyResults,
  MigrateFeatureGates,
  GetFeatureGates,
  UpdateFeatureGate,
  SeedPastCohorts,
  GetPastCohorts,
  GenerateTeamLogo,
  MigrateLogoVotes,
  GetTeamVotes,
  SubmitTeamVote,
  AutoGenerateTeams,
  UpdateCounselorProfile,
  MigrateCounselorVisibility,
  ToggleCounselorVisibility,
  UpdateTeamDesign,
  MigratePresentationsV2,
  UpdatePresentation,
  MigratePresentationWorkspace,
  GetPresentationResponses,
  SavePresentationResponses,
  MigrateBingo,
  GetBingoCard,
  SubmitBingoGuess,
  ScoreTeamPresentation,
  GetRubricTemplate,
  GetPointsBreakdown,
  MigratePointsCategory,
  MigrateCompanyAssignment,
  AssignCompanyToTeam,
  GetTeamWorkspace,
  SaveTeamWorkspace,
  MigrateHackathon,
  SaveHackathonSubmission,
  GetHackathonResults,
  SubmitHackathonVote,
  MigrateEBR,
  GetEBRRoleAssignments,
  SaveEBRRoleAssignment,
  ToggleScoresRevealed,
  ToggleAgendaDayLock,
  GetAgendaDayLocks,
  RandomizePresentationOrder,
  GetPresentationOrder,
  ClearPresentationOrder,
  QuickAwardPoints,
  MigratePreworkSubmissions,
  SubmitPreworkValidation,
  TogglePresentationLock,
  GetHubDashboard,
  MigrateNewHires,
  UploadNewHireList,
  GetNewHires,
  UpdateNewHireStatus,
  SetupWheelTables,
  CreateWheelRound,
  GetActiveWheelRound,
  SubmitWheelScore,
  CloseWheelScoring,
  GetWheelLeaderboard,
  SetupSpiritVoteTable,
  SubmitSpiritVote,
  GetSpiritVoteResults,
} as const;

export default apis;

/** Type for useApi inference - exported for client type-only imports */
export type ApiRegistry = typeof apis;
