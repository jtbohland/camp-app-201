import { useEffect } from "react";
import { useTypedApiData } from "@superblocksteam/library";
import { handleStaleAppError } from "@/lib/staleApp";

/**
 * Typed `useApiData` wrapper backed by the app's API registry.
 * Background reads double as an "is this tab out of date?" check: if one fails because the
 * app was redeployed, the page reloads to the latest version.
 */
import type { ApiRegistry } from "../../server/apis/index.js";

// eslint-disable-next-line react-hooks/rules-of-hooks -- useTypedApiData is a type-only factory (no React hooks are called at runtime)
const useBaseApiData = useTypedApiData<ApiRegistry>();

/** Typed `useApiData` with inference from `ApiRegistry`. */
export const useApiData = ((...args: unknown[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (useBaseApiData as any)(...args);
  const error = result?.error;
  useEffect(() => {
    if (error) handleStaleAppError(error);
  }, [error]);
  return result;
}) as typeof useBaseApiData;
