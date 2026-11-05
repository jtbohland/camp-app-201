import { useApiData } from "@/hooks/useApiData";

/**
 * Single source of truth for counselor/admin access.
 * Checked on the server against the verified admin list, counselor records, and guest judges.
 * Guest judges get counselor access but have no counselor profile.
 * Guest speakers (matched by the email a counselor saved on their speaker tile) get a limited view.
 */
export function useIsAdmin() {
  const { data, loading, refetch } = useApiData("GetMyAccess", {}, { staleTime: 60_000 });
  return {
    isAdmin: data?.isAdmin === true,
    isGuestJudge: data?.isGuestJudge === true,
    isSpeaker: data?.isSpeaker === true,
    speakerExecutiveId: data?.speakerExecutiveId ?? null,
    speakerName: data?.speakerName ?? null,
    loading,
    refetch,
  };
}
