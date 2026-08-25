import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";

type AssignMembersDialogProps = {
  teamId: number;
  onClose: () => void;
  onAssigned: () => void;
};

export default function AssignMembersDialog({ teamId, onClose, onAssigned }: AssignMembersDialogProps) {
  const { data: campersData, loading } = useApiData("GetRegisteredCampers", {});
  const { run: assignMembers, loading: assigning } = useApi("AssignTeamMembers");
  const [selected, setSelected] = useState<number[]>([]);

  // Pre-select campers already on this team
  const allCampers = campersData?.campers ?? [];

  const toggleCamper = useCallback((id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const handleAssign = useCallback(async () => {
    if (selected.length === 0) {
      toast.error("Select at least one camper");
      return;
    }
    try {
      await assignMembers({ team_id: teamId, camper_ids: selected });
      toast.success(`Assigned ${selected.length} member${selected.length > 1 ? "s" : ""} to the team`);
      onAssigned();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Failed to assign: " + message);
    }
  }, [selected, teamId, assignMembers, onAssigned]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-foreground mb-2">Assign Team Members</h2>
        <p className="text-sm text-muted-foreground mb-4">Select campers to add to this team. This will reassign them from any current team.</p>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <span className="text-muted-foreground text-sm">Loading campers…</span>
          </div>
        ) : (
          <div className="flex-1 overflow-auto border border-border rounded-lg divide-y divide-border">
            {allCampers.map((camper) => (
              <label
                key={camper.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(camper.id)}
                  onChange={() => toggleCamper(camper.id)}
                  className="rounded border-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {camper.first_name} {camper.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{camper.email}</p>
                </div>
                {camper.team_id && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Team {camper.team_id}
                  </span>
                )}
              </label>
            ))}
            {allCampers.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">No registered campers found</p>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={assigning || selected.length === 0}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {assigning ? "Assigning…" : `Assign ${selected.length} Member${selected.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
