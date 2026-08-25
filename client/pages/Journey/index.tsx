import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import JourneyPath from "@/components/JourneyPath";
import KnowBeforeYouGo from "@/components/KnowBeforeYouGo";
import PreWork from "@/components/PreWork";

export default function JourneyPage() {
  const user = useSuperblocksUser();

  const {
    data: camperData,
    loading: camperLoading,
  } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;

  const {
    data: preworkData,
    loading: preworkLoading,
    fetching: preworkFetching,
    refetch: refetchPrework,
  } = useApiData("GetPreworkStatus", {
    user_id: camperId,
  }, { enabled: camperId > 0 });

  const loading = camperLoading || preworkLoading;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-5xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!camperData?.isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Icon icon="compass" className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Register First</h2>
        <p className="text-sm text-muted-foreground">
          Head to Base Camp to register before starting your journey.
        </p>
      </div>
    );
  }

  const camper = camperData.camper;
  const completedKeys = (preworkData?.completedItems ?? []).map((item) => item.item);
  const allPreworkDone = completedKeys.length >= 3;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Icon icon="map" className="w-6 h-6 text-camp-amber" />
          Your cAMP Journey
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your progress from base camp to the summit.
        </p>
      </div>

      {/* Journey Path */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="milestone" className="w-5 h-5 text-camp-green" />
          Trail Progress
        </h2>
        <JourneyPath
          profileCompleted={camper?.profile_completed ?? false}
          preworkDone={allPreworkDone}
        />
      </Card>

      {/* Pre-Work Section */}
      <div className={preworkFetching && !preworkLoading ? "opacity-70" : ""}>
        <PreWork
          userId={camperId}
          camperEmail={user?.email ?? ""}
          completedKeys={completedKeys}
          onComplete={refetchPrework}
        />
      </div>

      {/* Know Before You Go */}
      <KnowBeforeYouGo />
    </div>
  );
}
