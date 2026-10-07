/**
 * Typed `useApi` wrapper backed by the app's API registry.
 *
 * This gives compile-time inference for API names, inputs, and outputs based on
 * `server/apis/index.ts`.
 *
 * Add APIs to `server/apis/index.ts` and import `useApi` from here.
 *
 * While a counselor is viewing a past cohort (read-only), `run` refuses any API that
 * changes data, so nothing can be written to the live cohort by accident.
 *
 * @example
 * ```typescript
 * import { useApi } from "@/hooks/useApi.js";
 *
 * const { run } = useApi("GetUsers");
 * // `run` is inferred from the `GetUsers` entry in `server/apis/index.ts`
 * ```
 */

import { useCallback, useMemo } from "react";
import { useTypedApi } from "@superblocksteam/library";
import { toast } from "sonner";
import { isWriteBlocked, READ_ONLY_MESSAGE } from "@/lib/readOnlyGuard";

import type { ApiRegistry } from "../../server/apis/index.js"; // Type-only import

// eslint-disable-next-line react-hooks/rules-of-hooks -- useTypedApi is a type-only factory (no React hooks are called at runtime)
const useBaseApi = useTypedApi<ApiRegistry>();

/** Typed `useApi` with inference from `ApiRegistry`, plus the past-cohort read-only guard. */
export const useApi = ((name: string, ...rest: unknown[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (useBaseApi as any)(name, ...rest);
  const baseRun = base.run;

  const run = useCallback(
    async (...args: unknown[]) => {
      if (isWriteBlocked(name)) {
        toast.info(READ_ONLY_MESSAGE);
        throw new Error(READ_ONLY_MESSAGE);
      }
      return baseRun(...args);
    },
    [name, baseRun]
  );

  return useMemo(() => ({ ...base, run }), [base, run]);
}) as typeof useBaseApi;
