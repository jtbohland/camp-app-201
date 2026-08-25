import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import ExecutiveCard from "@/components/ExecutiveCard/index.js";
import ExecutiveDialog from "@/components/ExecutiveDialog/index.js";

type Executive = {
  id: number;
  name: string;
  title: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  is_active: boolean;
};

export default function ExecutivesPage() {
  const user = useSuperblocksUser();
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { run: createExec } = useApi("CreateExecutive");
  const { run: updateExec } = useApi("UpdateExecutive");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExec, setEditingExec] = useState<Executive | null>(null);

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const { data: execData, loading: execLoading, fetching, refetch } = useApiData("GetExecutives", { active_only: !isAdmin });
  const loading = camperLoading || execLoading;

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
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const executives = execData?.executives ?? [];

  return (
    <div className="flex flex-col gap-6 p-6 w-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Icon icon="mic" className="w-6 h-6 text-primary" />
            Meet the Executives
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Leadership speakers and mentors you'll connect with during cAMP
          </p>
        </div>
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

      {/* Refetch indicator */}
      {fetching && !loading && (
        <div className="text-xs text-muted-foreground">Updating...</div>
      )}

      {/* Grid */}
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
            <ExecutiveCard
              key={exec.id}
              executive={exec}
              isAdmin={isAdmin}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <ExecutiveDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        executive={editingExec}
      />
    </div>
  );
}
