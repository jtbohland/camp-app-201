import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import ExecutiveCard from "@/components/ExecutiveCard/index.js";
import ExecutiveDialog from "@/components/ExecutiveDialog/index.js";
import ExecQAFeed from "@/components/ExecQAFeed/index.js";
import { Button } from "@/components/ui/button";

type Executive = {
  id: number;
  name: string;
  title: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  is_active: boolean;
};

export default function ExecutivesTab() {
  const user = useSuperblocksUser();
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { run: createExec } = useApi("CreateExecutive");
  const { run: updateExec } = useApi("UpdateExecutive");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExec, setEditingExec] = useState<Executive | null>(null);
  const [selectedExecForQA, setSelectedExecForQA] = useState<Executive | null>(null);

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const { data: execData, loading: execLoading, fetching, refetch } = useApiData("GetExecutives", { active_only: !isAdmin });
  const loading = camperLoading || execLoading;

  // Feature gate for Q&A
  const { data: gatesData, refetch: refetchGates } = useApiData("GetFeatureGates", {}, { staleTime: 15000 });
  const { run: updateGate, loading: togglingGate } = useApi("UpdateFeatureGate");
  const qaGate = (gatesData?.gates ?? []).find((g: any) => g.feature_key === "exec_qa");
  const qaLocked = qaGate?.is_locked ?? true;

  const handleToggleQA = useCallback(async () => {
    try {
      await updateGate({ feature_key: "exec_qa", is_locked: !qaLocked, unlock_at: null });
      toast.success(qaLocked ? "🔓 Q&A Unlocked" : "🔒 Q&A Locked");
      refetchGates();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [qaLocked, updateGate, refetchGates]);

  const handleAdd = useCallback(() => {
    setEditingExec(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((exec: Executive) => {
    setEditingExec(exec);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async (data: { name: string; title: string; photo_url: string; bio: string; linkedin_url: string }) => {
    try {
      if (editingExec) {
        await updateExec({
          id: editingExec.id,
          name: data.name,
          title: data.title,
          photo_url: data.photo_url || null,
          bio: data.bio || null,
          linkedin_url: data.linkedin_url || null,
          is_active: true,
        });
        toast.success("Executive updated");
      } else {
        await createExec({
          name: data.name,
          title: data.title,
          photo_url: data.photo_url || null,
          bio: data.bio || null,
          linkedin_url: data.linkedin_url || null,
        });
        toast.success("Executive added to bank");
      }
      await refetch();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Failed: " + message);
      throw error;
    }
  }, [editingExec, createExec, updateExec, refetch]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 w-full animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const executives = execData?.executives ?? [];

  // Q&A Feed view
  if (selectedExecForQA) {
    return (
      <div className="flex flex-col gap-6 p-6 w-full">
        {isAdmin && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleQA}
              disabled={togglingGate}
              className={qaLocked
                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }
            >
              <Icon icon={qaLocked ? "lock" : "lock-open"} className="w-3.5 h-3.5 mr-1.5" />
              {togglingGate ? "..." : qaLocked ? "Q&A Locked" : "Q&A Open"}
            </Button>
          </div>
        )}
        <ExecQAFeed
          executiveId={selectedExecForQA.id}
          executiveName={selectedExecForQA.name}
          camperId={camperData?.camper?.id ?? 0}
          camperTeamId={camperData?.camper?.team_id ?? null}
          isLocked={qaLocked && !isAdmin}
          onBack={() => setSelectedExecForQA(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Leadership speakers and mentors you'll connect with during cAMP
        </p>
        {isAdmin && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Icon icon="plus" className="w-4 h-4" />
            Add Executive
          </button>
        )}
      </div>

      {fetching && !loading && (
        <div className="text-xs text-muted-foreground">Updating...</div>
      )}

      {executives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Icon icon="users" className="w-12 h-12 opacity-30 mb-3" />
          <p className="text-sm">No executives added yet</p>
          {isAdmin && (
            <p className="text-xs mt-1">Click "Add Executive" to build your speaker bank</p>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${fetching ? "opacity-70" : ""}`}>
          {executives.map((exec: Executive) => (
            <div key={exec.id} className="cursor-pointer" onClick={() => setSelectedExecForQA(exec)}>
              <ExecutiveCard
                executive={exec}
                isAdmin={isAdmin}
                onEdit={handleEdit}
              />
            </div>
          ))}
        </div>
      )}

      <ExecutiveDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        executive={editingExec}
      />
    </div>
  );
}
