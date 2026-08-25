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

const apis = {
  SetupDatabase,
  RegisterCamper,
  GetCurrentCamper,
  UpdateCamperProfile,
  GetPreworkStatus,
  CompletePreworkItem,
} as const;

export default apis;

/** Type for useApi inference - exported for client type-only imports */
export type ApiRegistry = typeof apis;
