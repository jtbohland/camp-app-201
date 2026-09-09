import { useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import CamperAvatar from "@/components/CamperAvatar/index.js";

export default function AdminCounselorRotation() {
  const { data, refetch } = useApiData("GetCohort", {});
  const { run: toggle } = useApi("ToggleCounselorVisibility");

  const allMembers = data?.members ?? [];
  const counselors = allMembers.filter((m: any) => m.role === "counselor" || m.role === "admin");

  const handleToggle = useCallback(async (camperId: number, currentlyVisible: boolean) => {
    try {
      await toggle({ camper_id: camperId, visible: !currentlyVisible });
      toast.success(currentlyVisible ? "Counselor hidden from cohort" : "Counselor visible to cohort");
      refetch();
    } catch (error) {
      toast.error("Failed to toggle visibility");
    }
  }, [toggle, refetch]);

  if (counselors.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Icon icon="eye" className="w-5 h-5" />
          Counselor Rotation
        </h2>
        <p className="text-sm text-white/50">No counselors registered yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <Icon icon="eye" className="w-5 h-5" />
        Counselor Rotation
      </h2>
      <p className="text-sm text-white/60 mb-4">
        Choose which counselors are displayed on the Cohort tab for this cohort.
        Toggle off counselors who aren't leading this session.
      </p>

      <div className="flex flex-col gap-2">
        {counselors.map((c: any) => {
          const isVisible = c.visible_in_cohort !== false; // default true
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                isVisible ? "bg-white/10" : "bg-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <CamperAvatar
                  email={c.email}
                  photoUrl={c.photo_url}
                  name={`${c.first_name} ${c.last_name}`}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium text-white">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-white/40">{c.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(c.id, isVisible)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isVisible
                    ? "bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40"
                    : "bg-white/10 text-white/40 hover:bg-white/20"
                }`}
              >
                <Icon icon={isVisible ? "eye" : "eye-off"} className="w-3.5 h-3.5" />
                {isVisible ? "Visible" : "Hidden"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
