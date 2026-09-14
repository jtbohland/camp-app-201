import { useState, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import PresentationGrid from "@/components/PresentationGrid/index.js";
import PresentationDetail from "@/components/PresentationDetail/index.js";
import PeerFeedbackForm from "@/components/PeerFeedbackForm/index.js";
import CampfireFeed from "@/components/CampfireFeed/index.js";
import PresentationOrderStrip from "@/components/PresentationOrderStrip/index.js";

export default function PresentationsPage() {
  const user = useSuperblocksUser();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";

  // Feature gate for peer feedback
  const { data: gatesData, refetch: refetchGates } = useApiData("GetFeatureGates", {}, { staleTime: 15000 });
  const { run: updateGate, loading: togglingGate } = useApi("UpdateFeatureGate");
  const fbGate = (gatesData?.gates ?? []).find((g: any) => g.feature_key === "peer_feedback");
  const feedbackLocked = fbGate?.is_locked ?? true;

  const handleToggleFeedback = useCallback(async () => {
    try {
      await updateGate({ feature_key: "peer_feedback", is_locked: !feedbackLocked, unlock_at: null });
      toast.success(feedbackLocked ? "🔓 Peer Feedback Unlocked" : "🔒 Peer Feedback Locked");
      refetchGates();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [feedbackLocked, updateGate, refetchGates]);
  const camperId = camperData?.camper?.id ?? 0;
  const camperTeamId = camperData?.camper?.team_id ?? 0;

  const { data, loading, fetching, refetch } = useApiData("GetPresentations", {
    status: null,
  });

  const presentations = (data?.presentations ?? []) as any[];

  const selectedPresentation = presentations.find((p) => p.id === selectedId);

  const handleBack = useCallback(() => setSelectedId(null), []);

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
        {/* Header + Admin Controls */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Icon icon="presentation" className="w-6 h-6 text-purple-400" />
                Presentations
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Group presentations with rubrics and peer feedback
              </p>
            </div>
            {/* Admin toggle pills — compact, top-right */}
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleToggleFeedback}
                  disabled={togglingGate}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    feedbackLocked
                      ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  }`}
                  title={feedbackLocked ? "Click to unlock peer feedback" : "Click to lock peer feedback"}
                >
                  <Icon icon={feedbackLocked ? "lock" : "lock-open"} className="w-3 h-3" />
                  {togglingGate ? "..." : feedbackLocked ? "Feedback Locked" : "Feedback Open"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Presentation Order Strip */}
        <PresentationOrderStrip isAdmin={isAdmin} cohortId={1} />

        {/* Peer Feedback — only show when unlocked (or admin) */}
        {feedbackLocked && !isAdmin ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/40 text-muted-foreground text-sm border border-border/50">
            <Icon icon="lock" className="w-4 h-4 shrink-0" />
            Peer feedback will open during presentations — your counselor will unlock it
          </div>
        ) : (
          <PeerFeedbackForm camperId={camperId} camperTeamId={camperTeamId} />
        )}

        {/* Presentation Cards */}
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
