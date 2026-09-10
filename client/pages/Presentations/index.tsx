import { useState, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Skeleton } from "@/components/ui/skeleton";
import PresentationGrid from "@/components/PresentationGrid/index.js";
import PresentationDetail from "@/components/PresentationDetail/index.js";
import CreatePresentationForm from "@/components/CreatePresentationForm/index.js";
import { Button } from "@/components/ui/button";
import PeerFeedbackForm from "@/components/PeerFeedbackForm/index.js";
import CampfireFeed from "@/components/CampfireFeed/index.js";

export default function PresentationsPage() {
  const user = useSuperblocksUser();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const camperId = camperData?.camper?.id ?? 0;
  const camperTeamId = camperData?.camper?.team_id ?? 0;

  const { data, loading, fetching, refetch } = useApiData("GetPresentations", {
    status: null,
  });

  const presentations = (data?.presentations ?? []) as any[];

  const selectedPresentation = presentations.find((p) => p.id === selectedId);

  const handleBack = useCallback(() => setSelectedId(null), []);
  const handleCreated = useCallback(() => {
    setShowCreate(false);
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedPresentation) {
    return (
      <PresentationDetail
        presentation={selectedPresentation}
        camperId={camperId}
        camperTeamId={camperTeamId}
        isAdmin={isAdmin}
        onBack={handleBack}
        onRefresh={refetch}
      />
    );
  }

  // Grid view
  return (
    <div className="flex flex-col h-full w-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Icon icon="presentation" className="w-6 h-6 text-purple-400" />
              Presentations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Group presentations with rubrics and peer feedback
            </p>
          </div>
          {isAdmin && (
              <Button onClick={() => setShowCreate(!showCreate)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Icon icon={showCreate ? "x" : "plus"} className="w-4 h-4 mr-1.5" />
                {showCreate ? "Cancel" : "New Presentation"}
              </Button>
            )}
        </div>

        {showCreate && (
          <CreatePresentationForm camperId={camperId} onCreated={handleCreated} />
        )}

        {/* Peer Feedback — Campfire Review */}
        <PeerFeedbackForm camperId={camperId} camperTeamId={camperTeamId} />

        <div className={fetching ? "opacity-70" : ""}>
          <PresentationGrid
            presentations={presentations}
            onSelect={setSelectedId}
            isAdmin={isAdmin}
            onRefresh={refetch}
          />
        </div>

        {/* Live Campfire Feed */}
        <CampfireFeed camperId={camperId} />
      </div>
    </div>
  );
}
