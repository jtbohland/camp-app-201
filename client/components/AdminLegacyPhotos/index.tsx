import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GroupPhotoSlot, { type GroupPhoto } from "./GroupPhotoSlot.js";
import TrophyPhotoRow, { type ChampionTeam } from "./TrophyPhotoRow.js";

function errorText(error: unknown): string {
  return error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
}

/**
 * Counselor Hub → Legacy Photos: the cohort group photos (Past cAMPs carousel) and champion
 * trophy photos (Legacy Wall). Every save shows up on Past cAMPs right away.
 */
export default function AdminLegacyPhotos() {
  const { data: photoData, loading: loadingPhotos, refetch: refetchPhotos } = useApiData("GetGroupPhotos", {});
  const { data: pastData, loading: loadingPast, refetch: refetchPast } = useApiData("GetPastCohorts", {});
  const { run: saveGroupPhoto, loading: savingGroup } = useApi("SaveGroupPhoto");
  const { run: deleteGroupPhoto, loading: deleting } = useApi("DeleteGroupPhoto");
  const { run: saveTrophy, loading: savingTrophy } = useApi("SaveTrophyPhoto");
  const [pendingDelete, setPendingDelete] = useState<GroupPhoto | null>(null);
  const [extraNumber, setExtraNumber] = useState("");
  /** Cohorts added from "Another cohort" that don't have a photo yet. */
  const [extraSlots, setExtraSlots] = useState<number[]>([]);

  const photos = useMemo(() => photoData?.photos ?? [], [photoData]);
  const cohorts = useMemo(() => [...(pastData?.cohorts ?? [])].sort((a, b) => a.cohort_number - b.cohort_number), [pastData]);

  // One slot per Legacy Wall cohort, plus any photo for a cohort not on the wall yet (e.g. the current one).
  const slots = useMemo(() => {
    const byNumber = new Map(photos.map((p) => [p.cohort_number, p]));
    const list = cohorts.map((c) => ({ cohortNumber: c.cohort_number, defaultLabel: c.date_label, photo: byNumber.get(c.cohort_number) ?? null }));
    for (const p of photos) {
      if (!cohorts.some((c) => c.cohort_number === p.cohort_number)) list.push({ cohortNumber: p.cohort_number, defaultLabel: p.label, photo: p });
    }
    for (const n of extraSlots) {
      if (!list.some((s) => s.cohortNumber === n)) list.push({ cohortNumber: n, defaultLabel: "", photo: null });
    }
    return list.sort((a, b) => a.cohortNumber - b.cohortNumber);
  }, [photos, cohorts, extraSlots]);

  const champions: ChampionTeam[] = useMemo(
    () =>
      cohorts.flatMap((c) =>
        c.teams
          .filter((t) => t.is_winner || t.place === 1)
          .map((t) => ({ id: t.id, team_name: t.team_name, cohort_number: c.cohort_number, date_label: c.date_label, trophy_photo_url: t.trophy_photo_url }))
      ),
    [cohorts]
  );

  const withPhotos = slots.filter((s) => s.photo).length;
  const withTrophies = champions.filter((t) => t.trophy_photo_url).length;

  const handleSaveGroup = useCallback(
    async (args: { id: number | null; cohort_number: number; label: string; photo_data: string | null }) => {
      try {
        await saveGroupPhoto(args);
        toast.success(args.photo_data ? `Cohort ${args.cohort_number} photo added to the carousel` : "Label updated");
        await Promise.all([refetchPhotos(), queryClient.invalidateQueries("GetGroupPhotos")]);
      } catch (error) {
        toast.error("Couldn't save: " + errorText(error));
      }
    },
    [saveGroupPhoto, refetchPhotos]
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await deleteGroupPhoto({ id: pendingDelete.id });
      toast.success(`Cohort ${pendingDelete.cohort_number} photo deleted`);
      setPendingDelete(null);
      await Promise.all([refetchPhotos(), queryClient.invalidateQueries("GetGroupPhotos")]);
    } catch (error) {
      toast.error("Couldn't delete: " + errorText(error));
    }
  }, [pendingDelete, deleteGroupPhoto, refetchPhotos]);

  const handleTrophy = useCallback(
    async (teamId: number, photo: string | null) => {
      try {
        await saveTrophy({ team_id: teamId, photo_data: photo });
        toast.success(photo ? "Trophy photo added to the Legacy Wall" : "Trophy photo removed");
        await Promise.all([refetchPast(), queryClient.invalidateQueries("GetPastCohorts")]);
      } catch (error) {
        toast.error("Couldn't save: " + errorText(error));
      }
    },
    [saveTrophy, refetchPast]
  );

  if (loadingPhotos || loadingPast) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
        </div>
      </div>
    );
  }

  const extra = Number(extraNumber);
  const canAddExtra = Number.isInteger(extra) && extra > 0 && !slots.some((s) => s.cohortNumber === extra);

  return (
    <div className="space-y-6">
      {/* Group photos */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Icon icon="camera" className="h-5 w-5" /> 201 Group Pics
            </h2>
            <p className="text-sm text-muted-foreground">
              One tradition photo per cohort. Each one joins the Past cAMPs carousel, oldest first, as soon as it's added.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
            {withPhotos} of {slots.length} cohorts have a photo
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((s) => (
            <GroupPhotoSlot
              key={`${s.cohortNumber}-${s.photo?.id ?? "new"}`}
              cohortNumber={s.cohortNumber}
              defaultLabel={s.defaultLabel}
              photo={s.photo}
              busy={savingGroup || deleting}
              onSave={handleSaveGroup}
              onDelete={setPendingDelete}
            />
          ))}
          {/* Add a slot for a cohort that isn't on the Legacy Wall yet (e.g. the current cohort) */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-center">
            <Icon icon="plus" className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Another cohort</p>
            <div className="flex items-center gap-2">
              <Input value={extraNumber} onChange={(e) => setExtraNumber(e.target.value.replace(/\D/g, ""))} placeholder="#" className="h-8 w-16 text-center text-xs" />
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!canAddExtra}
                onClick={() => {
                  setExtraSlots((s) => [...s, extra]);
                  setExtraNumber("");
                }}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Trophy photos */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Icon icon="trophy" className="h-5 w-5 text-amber-500" /> Champion Trophy Photos
            </h2>
            <p className="text-sm text-muted-foreground">
              Shows on each winning team's tile on the Legacy Wall. You can also drop a photo right onto the tile there.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {withTrophies} of {champions.length} champions have a photo
          </span>
        </div>
        {champions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No champion teams on the Legacy Wall yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {[...champions].reverse().map((t) => (
              <TrophyPhotoRow key={t.id} team={t} busy={savingTrophy} onSave={handleTrophy} />
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete the Cohort {pendingDelete?.cohort_number} photo?</DialogTitle>
            <DialogDescription>It will be removed from the Past cAMPs carousel. You can upload it again anytime.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button onClick={() => void confirmDelete()} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
