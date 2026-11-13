import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import PhotoDropZone from "@/components/PhotoDropZone/index.js";

export type GroupPhoto = { id: number; cohort_number: number; label: string; photo_data: string };

type Props = {
  cohortNumber: number;
  /** Default label from the Legacy Wall ("June 2025"); editable. */
  defaultLabel: string;
  photo: GroupPhoto | null;
  busy: boolean;
  onSave: (args: { id: number | null; cohort_number: number; label: string; photo_data: string | null }) => Promise<void>;
  onDelete: (photo: GroupPhoto) => void;
};

/** One cohort's group photo: drop to add or replace, edit the label, delete. */
export default function GroupPhotoSlot({ cohortNumber, defaultLabel, photo, busy, onSave, onDelete }: Props) {
  const [label, setLabel] = useState(photo?.label ?? defaultLabel);
  const [error, setError] = useState<string | null>(null);
  const labelChanged = !!photo && label.trim() !== photo.label && label.trim().length > 0;

  const upload = (dataUrl: string) => {
    setError(null);
    void onSave({ id: photo?.id ?? null, cohort_number: cohortNumber, label: label.trim() || defaultLabel, photo_data: dataUrl });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <PhotoDropZone onPhoto={upload} onError={setError} disabled={busy} className="block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {({ dragging }) =>
          photo ? (
            <div className="group relative aspect-[4/3] bg-black">
              <img src={photo.photo_data} alt={`Cohort ${cohortNumber} group photo`} className="h-full w-full object-cover" />
              <div className={`absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white transition-opacity ${dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                <Icon icon="refresh-cw" className="mr-1.5 h-3.5 w-3.5" /> Drop or click to replace
              </div>
            </div>
          ) : (
            <div
              className={`flex aspect-[4/3] flex-col items-center justify-center gap-1 border-b-2 border-dashed text-xs transition-colors ${
                dragging ? "border-camp-green bg-camp-green/10" : "border-border bg-muted/30 hover:bg-muted/60"
              }`}
            >
              <Icon icon="image-plus" className="h-6 w-6 text-muted-foreground" />
              <span className="font-medium text-foreground">Add group photo</span>
              <span className="text-muted-foreground">Drop or click</span>
            </div>
          )
        }
      </PhotoDropZone>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-camp-green text-[11px] font-black text-white">C{cohortNumber}</span>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs" maxLength={60} placeholder="Month Year" />
        </div>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        {photo && (
          <div className="flex justify-between gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600 hover:text-red-700" onClick={() => onDelete(photo)} disabled={busy}>
              <Icon icon="trash-2" className="h-3.5 w-3.5" /> Delete
            </Button>
            {labelChanged && (
              <Button size="sm" className="h-7 px-2 text-xs" disabled={busy}
                onClick={() => void onSave({ id: photo.id, cohort_number: cohortNumber, label: label.trim(), photo_data: null })}>
                Save label
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
