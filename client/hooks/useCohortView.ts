import { useCallback } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { refreshAllCohortViews } from "@/lib/cohortRefresh";
import { setReadOnlyMode } from "@/lib/readOnlyGuard";

/**
 * Which cohort this user is looking at. cAMPers always see the active cohort.
 * Counselors can switch the whole app to a past cohort (read-only); the choice is
 * stored server-side, so every page and API follows it.
 */
export function useCohortView() {
  const { isAdmin } = useIsAdmin();
  const { data, loading } = useApiData("GetViewCohort", {}, { enabled: isAdmin, staleTime: 30_000 });
  const { run: setView, loading: switching } = useApi("SetViewCohort");

  const switchTo = useCallback(
    async (cohortId: number | null) => {
      await setView({ cohort_id: cohortId });
      await refreshAllCohortViews();
    },
    [setView]
  );

  const isPast = isAdmin && data?.is_past === true;
  return {
    /** Counselor is viewing a past cohort: hide every action that writes data. */
    isReadOnly: isPast,
    isPast,
    cohortId: data?.cohort_id ?? null,
    cohortName: data?.cohort_name ?? null,
    activeCohortId: data?.active_cohort_id ?? null,
    hasSnapshot: data?.has_snapshot ?? false,
    loading,
    switching,
    switchTo,
  };
}
