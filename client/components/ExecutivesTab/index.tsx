import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import SpeakerDaySection from "@/components/SpeakerDaySection/index.js";
import ExecutiveDialog, { type ExecutiveFormData } from "@/components/ExecutiveDialog/index.js";
import ExecQAFeed from "@/components/ExecQAFeed/index.js";
import { Button } from "@/components/ui/button";
import { groupSpeakersByDay, isSpeakerIncomplete, type Executive } from "@/lib/speakers.js";

export default function ExecutivesTab() {
  const user = useSuperblocksUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { run: createExec } = useApi("CreateExecutive");
  const { run: updateExec } = useApi("UpdateExecutive");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExec, setEditingExec] = useState<Executive | null>(null);
  const [selectedExecForQA, setSelectedExecForQA] = useState<Executive | null>(null);

  const { isAdmin, isSpeaker, speakerExecutiveId } = useIsAdmin();
  const { data: execData, loading: execLoading, fetching, refetch } = useApiData("GetExecutives", { active_only: !isAdmin });
  const loading = camperLoading || execLoading;
  const executives = (execData?.executives ?? []) as Executive[];
  const dayGroups = useMemo(() => groupSpeakersByDay(executives), [executives]);

  // Feature gate for Q&A
  const { data: gatesData, refetch: refetchGates } = useApiData("GetFeatureGates", {}, { staleTime: 15000 });
  const { run: updateGate, loading: togglingGate } = useApi("UpdateFeatureGate");
  const qaGate = (gatesData?.gates ?? []).find((g: any) => g.feature_key === "exec_qa");
  const qaLocked = qaGate?.is_locked ?? true;

  // Share links (?speaker=ID) open that speaker's Q&A. Guest speakers always land on their own.
  const linkedSpeakerId = Number(searchParams.get("speaker")) || null;
  useEffect(() => {
    if (!executives.length || selectedExecForQA) return;
    const targetId = isSpeaker ? speakerExecutiveId : linkedSpeakerId;
    if (!targetId) return;
    const target = executives.find((e) => e.id === targetId);
    if (target) setSelectedExecForQA(target);
  }, [executives, isSpeaker, speakerExecutiveId, linkedSpeakerId, selectedExecForQA]);

  // Keep the open Q&A in sync with fresh speaker data (e.g. after an edit).
  useEffect(() => {
    if (!selectedExecForQA) return;
    const fresh = executives.find((e) => e.id === selectedExecForQA.id);
    if (fresh && fresh !== selectedExecForQA) setSelectedExecForQA(fresh);
  }, [executives, selectedExecForQA]);

  const closeQA = useCallback(() => {
    setSelectedExecForQA(null);
    if (searchParams.has("speaker")) {
      const next = new URLSearchParams(searchParams);
      next.delete("speaker");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    // Edit from the library: stay on the tiles view (never open the Q&A page)
    setSelectedExecForQA(null);
    setEditingExec(exec);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: ExecutiveFormData): Promise<number | null> => {
      const fields = {
        name: data.name,
        title: data.title,
        photo_url: data.photo_url || null,
        bio: data.bio || null,
        linkedin_url: data.linkedin_url || null,
        email: data.email,
        slack_name: data.slack_name,
        agenda_item_id: data.agenda_item_id,
      };
      try {
        if (editingExec) {
          await updateExec({ id: editingExec.id, ...fields, is_active: true });
          toast.success("Speaker updated");
          await refetch();
          return editingExec.id;
        }
        const result = await createExec(fields);
        toast.success("Speaker added. Copy their share link next.");
        await refetch();
        return result?.id ?? null;
      } catch (error) {
        const message = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
        toast.error("Failed: " + message);
        throw error;
      }
    },
    [editingExec, createExec, updateExec, refetch]
  );

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

  // Q&A Feed view
  if (selectedExecForQA) {
    const isMySession = isSpeaker && selectedExecForQA.id === speakerExecutiveId;
    const mode = isAdmin ? "counselor" : isMySession ? "speaker" : "camper";
    return (
      <div className="flex flex-col gap-6 p-6 w-full">
        {isAdmin && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleQA}
              disabled={togglingGate}
              className={
                qaLocked
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }
            >
              <Icon icon={qaLocked ? "lock" : "lock-open"} className="w-3.5 h-3.5 mr-1.5" />
              {togglingGate ? "..." : qaLocked ? "Q&A Locked" : "Q&A Open"}
            </Button>
          </div>
        )}
        {isSpeaker && !isMySession && (
          <button onClick={closeQA} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
            <Icon icon="arrow-left" className="w-4 h-4" />
            Back to Speakers
          </button>
        )}
        {/* Speakers see other sessions read-only and can't ask questions. */}
        {isSpeaker && !isMySession ? (
          <ExecQAFeed speaker={selectedExecForQA} camperId={0} camperTeamId={null} isLocked onBack={closeQA} mode="camper" />
        ) : (
          <ExecQAFeed
            speaker={selectedExecForQA}
            camperId={camperData?.camper?.id ?? 0}
            camperTeamId={camperData?.camper?.team_id ?? null}
            isLocked={qaLocked}
            onBack={closeQA}
            mode={mode}
          />
        )}
        {isMySession && executives.length > 1 && (
          <button onClick={closeQA} className="text-xs text-muted-foreground hover:text-foreground w-fit">
            See all speakers →
          </button>
        )}
      </div>
    );
  }

  const incompleteCount = isAdmin ? executives.filter(isSpeakerIncomplete).length : 0;

  return (
    <div className="flex flex-col gap-6 p-6 w-full">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Map each speaker to their agenda session. cAMPers see a speaker once that day's agenda is unlocked."
            : "Leadership speakers and mentors you'll connect with during cAMP. More appear as each day unlocks."}
          {incompleteCount > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              {incompleteCount} need setup
            </span>
          )}
        </p>
        {isAdmin && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0"
          >
            <Icon icon="plus" className="w-4 h-4" />
            Add Speaker
          </button>
        )}
      </div>

      {fetching && !loading && <div className="text-xs text-muted-foreground">Updating...</div>}

      {executives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Icon icon="users" className="w-12 h-12 opacity-30 mb-3" />
          <p className="text-sm">{isAdmin ? "No speakers added yet" : "Speakers will appear here as each day's agenda unlocks"}</p>
          {isAdmin && <p className="text-xs mt-1">Click "Add Speaker" to build your speaker library</p>}
        </div>
      ) : (
        <div className={`flex flex-col gap-8 ${fetching ? "opacity-70" : ""}`}>
          {dayGroups.map((group) => (
            <SpeakerDaySection
              key={group.dayNumber ?? "none"}
              group={group}
              isAdmin={isAdmin}
              mySpeakerId={isSpeaker ? speakerExecutiveId ?? null : null}
              onOpen={setSelectedExecForQA}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <ExecutiveDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleSave} executive={editingExec} />
    </div>
  );
}
