import { useApiData } from "@/hooks/useApiData";

/**
 * Single source of truth for counselor/admin access.
 * Checked on the server against the verified admin list (and counselor records).
 */
export function useIsAdmin() {
  const { data, loading, refetch } = useApiData("GetMyAccess", {}, { staleTime: 60_000 });
  return { isAdmin: data?.isAdmin === true, loading, refetch };
}
