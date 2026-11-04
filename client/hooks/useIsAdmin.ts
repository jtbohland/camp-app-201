import { useApiData } from "@/hooks/useApiData";

/**
 * Single source of truth for counselor/admin access.
 * Checked on the server against the verified admin list, counselor records, and guest judges.
 * Guest judges get counselor access but have no counselor profile.
 */
export function useIsAdmin() {
  const { data, loading, refetch } = useApiData("GetMyAccess", {}, { staleTime: 60_000 });
  return {
    isAdmin: data?.isAdmin === true,
    isGuestJudge: data?.isGuestJudge === true,
    loading,
    refetch,
  };
}
