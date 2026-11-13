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
import LegacyPhotoSlot, { type LegacyPhoto, type SaveLegacyPhotoArgs } from "./LegacyPhotoSlot.js";
import { enhancePhoto } from "@/lib/enhancePhoto.js";

type Kind = "group" | "trophy";

function errorText(error: unknown): string {
  return error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
}

type Slot = { cohortNumber: number; defaultLabel: string; caption?: string; photo: LegacyPhoto | null };

/** "Another cohort" box: adds an empty slot for a cohort not on the Legacy Wall yet. */
function AddCohortSlot({ taken, onAdd, accent }: { taken: number[]; onAdd: (n: number) => void; accent: string }) {
  const [value, setValue] = useState("");
  const n = Number(value);
  const ok = Number.isInteger(n) && n > 0 && !taken.includes(n);
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-center">
      <Icon icon="plus" className={`h-5 w-5 ${accent}`} />
      <p className="text-xs text-muted-foreground">Another cohort</p>
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} placeholder="#" className="h-8 w-16 text-center text-xs" />
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!ok} onClick={() => { onAdd(n); setValue(""); }}>
          Add
        </Button>
      </div>
    </div>
  );
}

/**
 * Counselor Hub → Legacy Photos: cohort group photos (Past cAMPs carousel) and trophy photos
 * (champion tiles). Both work the same way: one slot per cohort, drop to add, drag to reposition.
 */
export default function AdminLegacyPhotos() {
  const { data: photoData, loading: loadingPhotos, refetch: refetchPhotos } = useApiData("GetGroupPhotos", {});
  const { data: pastData, loading: loadingPast } = useApiData("GetPastCohorts", {});
  const { run: savePhoto, loading: saving } = useApi("SaveGroupPhoto");
  const { run: deletePhoto, loading: deleting } = useApi("DeleteGroupPhoto");
  const { run: restoreOriginal, loading: restoring } = useApi("RestoreGroupPhotoOriginal");
  /** Photo ids being enhanced right now. */
  const [enhancingIds, setEnhancingIds] = useState<number[]>([]);
  const [enhanceAllProgress, setEnhanceAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LegacyPhoto | null>(null);
  const [extraSlots, setExtraSlots] = useState<Record<Kind, number[]>>({ group: [], trophy: [] });
  /** After a fresh upload, open the positioner on that slot. */
  const [positionAfterUpload, setPositionAfterUpload] = useState<string | null>(null);

  const photos = useMemo(() => (photoData?.photos ?? []) as LegacyPhoto[], [photoData]);
  const cohorts = useMemo(() => [...(pastData?.cohorts ?? [])].sort((a, b) => a.cohort_number - b.cohort_number), [pastData]);

  const buildSlots = useCallback(
    (kind: Kind): Slot[] => {
      const byNumber = new Map(photos.filter((p) => p.kind === kind).map((p) => [p.cohort_number, p]));
      const list: Slot[] = cohorts
        // Trophy slots only for cohorts that crowned a champion
        .filter((c) => kind === "group" || c.teams.some((t) => t.is_winner || t.place === 1))
        .map((c) => {
          const champ = c.teams.find((t) => t.is_winner) ?? c.teams.find((t) => t.place === 1);
          return {
            cohortNumber: c.cohort_number,
            defaultLabel: kind === "group" ? c.date_label : champ?.team_name ?? "",
            caption: kind === "trophy" ? `Cohort ${c.cohort_number} · ${c.date_label}` : undefined,
            photo: byNumber.get(c.cohort_number) ?? null,
          };
        });
      for (const p of byNumber.values()) {
        if (!list.some((s) => s.cohortNumber === p.cohort_number)) {
          list.push({ cohortNumber: p.cohort_number, defaultLabel: p.label, caption: kind === "trophy" ? `Cohort ${p.cohort_number}` : undefined, photo: p });
        }
      }
      for (const n of extraSlots[kind]) {
        if (!list.some((s) => s.cohortNumber === n)) list.push({ cohortNumber: n, defaultLabel: "", caption: kind === "trophy" ? `Cohort ${n}` : undefined, photo: null });
      }
      return list.sort((a, b) => a.cohortNumber - b.cohortNumber);
    },
    [photos, cohorts, extraSlots]
  );

  const groupSlots = useMemo(() => buildSlots("group"), [buildSlots]);
  // Newest champion first, since that's the one counselors add after each cAMP.
  const trophySlots = useMemo(() => [...buildSlots("trophy")].reverse(), [buildSlots]);

  const handleSave = useCallback(
    async (args: SaveLegacyPhotoArgs) => {
      try {
        await savePhoto(args);
        const isTrophy = args.kind === "trophy";
        toast.success(
          args.photo_data
            ? isTrophy ? "Trophy photo added. Drag it to frame the faces." : `Cohort ${args.cohort_number} photo added to the carousel`
            : "Saved"
        );
        await Promise.all([refetchPhotos(), queryClient.invalidateQueries("GetGroupPhotos")]);
        if (args.photo_data && isTrophy) setPositionAfterUpload(`trophy-${args.cohort_number}`);
      } catch (error) {
        toast.error("Couldn't save: " + errorText(error));
      }
    },
    [savePhoto, refetchPhotos]
  );

  /** Enhance one photo already in the library; keeps the current photo as the original for undo. */
  const enhanceOne = useCallback(
    async (photo: LegacyPhoto) => {
      setEnhancingIds((cur) => [...cur, photo.id]);
      try {
        await new Promise((r) => setTimeout(r, 30)); // let "Enhancing…" paint
        const { dataUrl } = await enhancePhoto(photo.photo_data);
        await savePhoto({
          id: photo.id,
          kind: photo.kind,
          cohort_number: photo.cohort_number,
          label: photo.label,
          photo_data: dataUrl,
          original_data: photo.photo_data,
          enhanced: true,
          focus_x: photo.focus_x,
          focus_y: photo.focus_y,
        });
        return true;
      } finally {
        setEnhancingIds((cur) => cur.filter((id) => id !== photo.id));
      }
    },
    [savePhoto]
  );

  const handleEnhance = useCallback(
    async (photo: LegacyPhoto) => {
      try {
        await enhanceOne(photo);
        toast.success(`Cohort ${photo.cohort_number} ${photo.kind} photo enhanced. Tap “Original” to undo.`);
        await Promise.all([refetchPhotos(), queryClient.invalidateQueries("GetGroupPhotos")]);
      } catch (error) {
        toast.error("Couldn't enhance: " + errorText(error));
      }
    },
    [enhanceOne, refetchPhotos]
  );

  const handleEnhanceAll = useCallback(async () => {
    const todo = photos.filter((p) => !p.enhanced);
    if (todo.length === 0) return;
    setEnhanceAllProgress({ done: 0, total: todo.length });
    let failed = 0;
    for (let i = 0; i < todo.length; i++) {
      try {
        await enhanceOne(todo[i]);
      } catch {
        failed++;
      }
      setEnhanceAllProgress({ done: i + 1, total: todo.length });
    }
    setEnhanceAllProgress(null);
    await Promise.all([refetchPhotos(), queryClient.invalidateQueries("GetGroupPhotos")]);
    if (failed) toast.error(`${failed} photo${failed > 1 ? "s" : ""} couldn't be enhanced`);
    else toast.success(`Enhanced ${todo.length} photo${todo.length > 1 ? "s" : ""}. Each one can be undone with “Original”.`);
  }, [photos, enhanceOne, refetchPhotos]);

  const handleRestore = useCallback(
    async (photo: LegacyPhoto) => {
      try {
        await restoreOriginal({ id: photo.id });
        toast.success("Original photo restored");
        await Promise.all([refetchPhotos(), queryClient.invalidateQueries("GetGroupPhotos")]);
      } catch (error) {
        toast.error("Couldn't restore: " + errorText(error));
      }
    },
    [restoreOriginal, refetchPhotos]
  );

  const unenhancedCount = photos.filter((p) => !p.enhanced).length;

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await deletePhoto({ id: pendingDelete.id });
      toast.success(`Cohort ${pendingDelete.cohort_number} ${pendingDelete.kind} photo deleted`);
      setPendingDelete(null);
      await Promise.all([refetchPhotos(), queryClient.invalidateQueries("GetGroupPhotos")]);
    } catch (error) {
      toast.error("Couldn't delete: " + errorText(error));
    }
  }, [pendingDelete, deletePhoto, refetchPhotos]);

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

  const renderSection = (kind: Kind, slots: Slot[]) => {
    const isTrophy = kind === "trophy";
    const filled = slots.filter((s) => s.photo).length;
    return (
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              {isTrophy ? <Icon icon="trophy" className="h-5 w-5 text-amber-500" /> : <Icon icon="camera" className="h-5 w-5" />}
              {isTrophy ? "Champion Trophy Photos" : "201 Group Pics"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isTrophy
                ? "One per cohort, shown on the winning team's tile on the Legacy Wall. After uploading, drag the photo to keep faces in frame. Add one for a new cohort with “Another cohort”."
                : "One tradition photo per cohort. Each joins the Past cAMPs carousel, oldest first, and is always shown in full."}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isTrophy ? "bg-amber-100 text-amber-800" : "bg-muted text-foreground"}`}>
            {filled} of {slots.length} have a photo
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((s) => {
            const key = `${kind}-${s.cohortNumber}`;
            return (
              <LegacyPhotoSlot
                key={`${key}-${s.photo?.id ?? "new"}`}
                kind={kind}
                cohortNumber={s.cohortNumber}
                defaultLabel={s.defaultLabel}
                caption={s.caption}
                photo={s.photo}
                busy={saving || deleting || restoring || !!enhanceAllProgress}
                enhancing={!!s.photo && enhancingIds.includes(s.photo.id)}
                onEnhance={(p) => void handleEnhance(p)}
                onRestore={(p) => void handleRestore(p)}
                startPositioning={positionAfterUpload === key && !!s.photo}
                onPositioningDone={() => setPositionAfterUpload((cur) => (cur === key ? null : cur))}
                onSave={handleSave}
                onDelete={setPendingDelete}
              />
            );
          })}
          <AddCohortSlot
            taken={slots.map((s) => s.cohortNumber)}
            accent={isTrophy ? "text-amber-500" : "text-muted-foreground"}
            onAdd={(n) => setExtraSlots((cur) => ({ ...cur, [kind]: [...cur[kind], n] }))}
          />
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Auto-enhance banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
        <div className="flex items-start gap-2">
          <Icon icon="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs text-foreground/80">
            <span className="font-semibold text-foreground">New uploads are auto-enhanced.</span> Brightness and contrast are balanced, grain is smoothed, and the photo is gently sharpened. Nothing is redrawn or AI-generated, and “Original” puts back the exact upload.
          </p>
        </div>
        {unenhancedCount > 0 && (
          <Button size="sm" variant="outline" className="shrink-0 border-amber-300 bg-white" disabled={!!enhanceAllProgress || saving}
            onClick={() => void handleEnhanceAll()}>
            <Icon icon="sparkles" className="h-3.5 w-3.5 text-amber-500" />
            {enhanceAllProgress
              ? `Enhancing ${enhanceAllProgress.done + 1 > enhanceAllProgress.total ? enhanceAllProgress.total : enhanceAllProgress.done + 1} of ${enhanceAllProgress.total}…`
              : `Enhance ${unenhancedCount} existing photo${unenhancedCount > 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
      {renderSection("group", groupSlots)}
      {renderSection("trophy", trophySlots)}

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete the Cohort {pendingDelete?.cohort_number} {pendingDelete?.kind === "trophy" ? "trophy" : "group"} photo?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.kind === "trophy"
                ? "It will be removed from the champion tile on the Legacy Wall."
                : "It will be removed from the Past cAMPs carousel."}{" "}
              You can upload it again anytime.
            </DialogDescription>
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
