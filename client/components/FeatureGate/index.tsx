import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";

type FeatureGateProps = {
  featureKey: string;
  children: ReactNode;
  /** If true, bypass the gate (e.g. for admins) */
  bypass?: boolean;
};

export default function FeatureGate({ featureKey, children, bypass = false }: FeatureGateProps) {
  const { data } = useApiData("GetFeatureGates", {}, { staleTime: 30_000 });

  if (bypass) return <>{children}</>;

  const gates = data?.gates ?? [];
  const gate = gates.find((g: { feature_key: string }) => g.feature_key === featureKey);

  // If gates haven't loaded yet, show children (avoid blocking on initial load)
  if (!data) return <>{children}</>;

  // If gate doesn't exist, show children (no gate = no restriction)
  if (!gate) return <>{children}</>;

  if (gate.is_locked) {
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
