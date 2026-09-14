import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData.js";
import TrailMap from "@/components/TrailMap/index.js";

export default function BadgesPage() {
  // Camp close awareness — lock badges until all leaderboards revealed
  const { data: closeStatus } = useApiData("GetCloseCampStatus", {}, { staleTime: 10000 });
  const campClosed = closeStatus?.camp_closed ?? false;
  const vpRevealed = closeStatus?.vp_revealed ?? false;
  const badgesLocked = campClosed && !vpRevealed;

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-6 py-4">
          <Icon icon="map" className="w-6 h-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Camp Trail Map</h1>
            <p className="text-xs text-muted-foreground">Your journey through cAMP — earn badges, climb tiers, unlock awards</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {badgesLocked ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center p-6">
                <div className="text-4xl mb-3">🏕️</div>
                <h3 className="font-bold text-lg text-foreground">Trail Map Locked</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  cAMP has closed! Final badges and standings are being revealed during the podium ceremony. Check back soon!
                </p>
              </div>
            </div>
          ) : (
            <TrailMap />
          )}
        </div>
      </div>
    </div>
  );
}
