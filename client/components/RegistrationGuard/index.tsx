import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import RegistrationCompletionModal from "@/components/RegistrationCompletionModal/index.js";

// Pages managers may open without a camper record
const MANAGER_PATHS = ["/manager", "/agenda", "/leaderboard"];
// Pages guest speakers may open: Base Camp, Agenda (their Q&A), Teams & Cohort
const SPEAKER_PATHS = ["/agenda", "/teams"];

/**
 * Registration is required. Until a cAMPer has registered AND completed their
 * profile, every page sends them back to that step. Counselors skip this.
 */
export default function RegistrationGuard({ children }: { children: ReactNode }) {
  const user = useSuperblocksUser();
  const { pathname } = useLocation();
  const email = user?.email ?? "";
  const { isAdmin, isSpeaker, loading: loadingAccess } = useIsAdmin();
  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", { email }, { enabled: !!email });
  const { data: managerData, loading: loadingManager } = useApiData("GetCurrentManager", { email }, { enabled: !!email });

  if (loadingAccess || loadingCamper || loadingManager) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Counselors/admins are never blocked by registration or profile checks.
  if (isAdmin) return <>{children}</>;

  const camper = camperData?.camper;
  const isManager = managerData?.isManager === true;

  // Not registered at all → landing page (choose cAMPer / Manager / Counselor)
  if (!camper) {
    if (isSpeaker && (pathname === "/" || SPEAKER_PATHS.some((p) => pathname.startsWith(p)))) return <>{children}</>;
    if (isManager && MANAGER_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;
    if (pathname !== "/") return <Navigate to="/" replace />;
    return <>{children}</>;
  }

  // Has an account but required registration details are missing → blocking modal on any page.
  // Nothing behind it is usable, and it can't be closed until every field is filled in.
  if (camperData?.needsRegistration) {
    return (
      <div className="flex flex-col gap-4 p-8" aria-hidden>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <RegistrationCompletionModal
          key={camper.id}
          userEmail={email}
          camper={camper}
          missingProfile={camperData.missingProfile ?? []}
        />
      </div>
    );
  }

  // Registered but profile not complete → profile page only
  if (!camper.profile_completed && pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  // Counselor Hub is for counselors only
  if (pathname.startsWith("/admin")) return <Navigate to="/" replace />;

  return <>{children}</>;
}
