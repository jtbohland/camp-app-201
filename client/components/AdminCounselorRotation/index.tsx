import { useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import CamperAvatar from "@/components/CamperAvatar/index.js";

type Counselor = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  photo_url: string | null;
  visible_in_cohort: boolean | null;
};

export default function AdminCounselorRotation() {
  const { data, loading, refetch } = useApiData("GetCounselorRotation", {});
  const { run: toggle } = useApi("ToggleCounselorVisibility");

  const counselors: Counselor[] = data?.counselors ?? [];

  const handleToggle = useCallback(async (camperId: number, currentlyVisible: boolean) => {
    try {
      await toggle({ camper_id: camperId, visible: !currentlyVisible });
      toast.success(currentlyVisible ? "Counselor hidden from cohort" : "Counselor visible to cohort");
      refetch();
    } catch {
      toast.error("Failed to toggle visibility");
    }
  }, [toggle, refetch]);

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
        <Icon icon="eye" className="w-5 h-5" />
        Counselor Rotation
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Shared with all counselors. Choose who appears on the Cohort tab for the active cohort.
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : counselors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No counselors yet. Counselors appear here after they verify with the cAMP Counselor tile.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {counselors.map((c) => {
            const isVisible = c.visible_in_cohort !== false;
            const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email;
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isVisible ? "bg-muted" : "bg-muted/40 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CamperAvatar email={c.email} photoUrl={c.photo_url} name={name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(c.id, isVisible)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isVisible
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-muted text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon icon={isVisible ? "eye" : "eye-off"} className="w-3.5 h-3.5" />
                  {isVisible ? "Visible" : "Hidden"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
