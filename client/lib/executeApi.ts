import { createTypedExecuteApi } from "@superblocksteam/library";
import { handleStaleAppError, pendingReload } from "@/lib/staleApp";

/**
 * Typed `executeApi` wrapper backed by the app's API registry.
 * For calling APIs outside of React components.
 * If the tab is running an old copy of the app, it reloads to the latest instead of failing.
 */
import type { ApiRegistry } from "../../server/apis/index.js";

const baseExecuteApi = createTypedExecuteApi<ApiRegistry>();

export const executeApi = (async (...args: Parameters<typeof baseExecuteApi>) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (baseExecuteApi as any)(...args);
  } catch (err) {
    if (handleStaleAppError(err)) return pendingReload();
    throw err;
  }
}) as typeof baseExecuteApi;
