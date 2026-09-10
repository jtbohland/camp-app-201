import { type ReactNode, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";

type FeatureGateProps = {
  featureKey: string;
  children: ReactNode;
  /** If true, bypass the gate (e.g. for admins) */
  bypass?: boolean;
};

export default function FeatureGate({ featureKey, children, bypass = false }: FeatureGateProps) {
  const user = useSuperblocksUser();
  const { data, refetch } = useApiData("GetFeatureGates", {}, { staleTime: 30_000 });
  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email, staleTime: 60_000 });
  const { run: updateGate, loading: toggling } = useApi("UpdateFeatureGate");

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";

  const gates = data?.gates ?? [];
  const gate = gates.find((g: { feature_key: string }) => g.feature_key === featureKey);
  const isLocked = gate?.is_locked ?? false;

  const handleToggle = useCallback(async () => {
    try {
      await updateGate({
        feature_key: featureKey,
        is_locked: !isLocked,
        unlock_at: null,
      });
      toast.success(isLocked ? `🔓 Unlocked: ${featureKey}` : `🔒 Locked: ${featureKey}`);
      refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [featureKey, isLocked, updateGate, refetch]);

  // Admin toggle button — small pill
  const AdminToggle = isAdmin ? (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
        isLocked
          ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
          : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
      }`}
      title={isLocked ? "Click to unlock for all campers" : "Click to lock for campers"}
    >
      <Icon icon={isLocked ? "lock" : "lock-open"} className="w-3 h-3" />
      {toggling ? "..." : isLocked ? "Locked" : "Unlocked"}
    </button>
  ) : null;

  if (bypass || isAdmin) {
    return (
      <div className="relative">
        {isAdmin && gate && (
          <div className="absolute top-2 right-2 z-10">
            {AdminToggle}
          </div>
        )}
        {children}
      </div>
    );
  }

  if (!data) return <>{children}</>;
  if (!gate) return <>{children}</>;

  if (isLocked) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="p-8 text-center max-w-md border-camp-amber/20">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-camp-amber/10 mb-4">
            <Icon icon="lock" className="w-8 h-8 text-camp-amber" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">This trail opens soon</h2>
          <p className="text-sm text-muted-foreground">
            Your counselor will unlock this section when it&apos;s time. Check back later!
          </p>
          {gate.unlock_at && (
            <p className="text-xs text-camp-amber mt-3 flex items-center justify-center gap-1">
              <Icon icon="clock" className="w-3.5 h-3.5" />
              Opens {new Date(gate.unlock_at).toLocaleString()}
            </p>
          )}
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
