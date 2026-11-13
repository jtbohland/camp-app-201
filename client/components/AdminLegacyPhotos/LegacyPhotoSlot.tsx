import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import PhotoDropZone from "@/components/PhotoDropZone/index.js";
import PhotoPositioner from "@/components/PhotoPositioner/index.js";

export type LegacyPhoto = {
  id: number;
  kind: "group" | "trophy";
  cohort_number: number;
  label: string;
  photo_data: string;
  focus_x: number;
  focus_y: number;
};

export type SaveLegacyPhotoArgs = {
  id: number | null;
  kind: "group" | "trophy";
  cohort_number: number;
  label: string;
  photo_data: string | null;
  focus_x: number;
  focus_y: number;
};

type Props = {
  kind: "group" | "trophy";
  cohortNumber: number;
  /** Group: "June 2025". Trophy: the champion team's name. Editable. */
  defaultLabel: string;
  /** Shown under the label (trophy slots show the cohort date). */
  caption?: string;
  photo: LegacyPhoto | null;
  busy: boolean;
  /** Opens the positioner right away (set by the parent after a fresh upload lands). */
  startPositioning?: boolean;
  onPositioningDone?: () => void;
  onSave: (args: SaveLegacyPhotoArgs) => Promise<void>;
  onDelete: (photo: LegacyPhoto) => void;
};

/** Where each kind of photo is shown, so the reposition preview crops the same way. */
const ASPECT = { group: "16 / 9", trophy: "16 / 10" } as const;

/** One cohort's group or trophy photo: drop to add/replace, drag to reposition, edit label, delete. */
export default function LegacyPhotoSlot({
  kind, cohortNumber, defaultLabel, caption, photo, busy, startPositioning, onPositioningDone, onSave, onDelete,
}: Props) {
  const [label, setLabel] = useState(photo?.label ?? defaultLabel);
  const [error, setError] = useState<string | null>(null);
  const [positioningLocal, setPositioningLocal] = useState(false);
  // Only trophy photos are cropped (the carousel shows group photos in full), so only they reposition.
  const canPosition = kind === "trophy";
  const positioning = canPosition && (positioningLocal || !!startPositioning);
  const setPositioning = (v: boolean) => {
    setPositioningLocal(v);
    if (!v) onPositioningDone?.();
  };
  const labelChanged = !!photo && label.trim() !== photo.label && label.trim().length > 0;
  const isTrophy = kind === "trophy";

  const base = (over: Partial<SaveLegacyPhotoArgs>): SaveLegacyPhotoArgs => ({
    id: photo?.id ?? null,
    kind,
    cohort_number: cohortNumber,
    label: label.trim() || defaultLabel || `Cohort ${cohortNumber}`,
    photo_data: null,
    focus_x: photo?.focus_x ?? 50,
    focus_y: photo?.focus_y ?? 40,
    ...over,
  });

  const upload = (dataUrl: string) => {
    setError(null);
    // A new photo starts centered; the parent opens the positioner once it lands so faces can be framed.
    void onSave(base({ photo_data: dataUrl, focus_x: 50, focus_y: 40 }));
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {positioning && photo ? (
        <div className="p-2">
          <PhotoPositioner
            src={photo.photo_data}
            focusX={photo.focus_x}
            focusY={photo.focus_y}
            aspect={ASPECT[kind]}
            saving={busy}
            onCancel={() => setPositioning(false)}
            onSave={(f) => void onSave(base({ focus_x: f.x, focus_y: f.y })).then(() => setPositioning(false))}
          />
        </div>
      ) : (
        <PhotoDropZone onPhoto={upload} onError={setError} disabled={busy} maxSize={1600}
          className="block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {({ dragging }) =>
            photo ? (
              <div className="group relative bg-black" style={{ aspectRatio: ASPECT[kind] }}>
                <img src={photo.photo_data} alt={`Cohort ${cohortNumber} ${kind} photo`}
                  className={`h-full w-full ${canPosition ? "object-cover" : "object-contain"}`}
                  style={canPosition ? { objectPosition: `${photo.focus_x}% ${photo.focus_y}%` } : undefined} />
                <div className={`absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white transition-opacity ${dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <Icon icon="refresh-cw" className="mr-1.5 h-3.5 w-3.5" /> Drop or click to replace
                </div>
              </div>
            ) : (
              <div
                className={`flex flex-col items-center justify-center gap-1 border-b-2 border-dashed text-xs transition-colors ${
                  dragging ? (isTrophy ? "border-amber-400 bg-amber-50" : "border-camp-green bg-camp-green/10") : "border-border bg-muted/30 hover:bg-muted/60"
                }`}
                style={{ aspectRatio: ASPECT[kind] }}
              >
                <Icon icon={isTrophy ? "trophy" : "image-plus"} className={`h-6 w-6 ${isTrophy ? "text-amber-500" : "text-muted-foreground"}`} />
                <span className="font-medium text-foreground">{isTrophy ? "Add trophy photo" : "Add group photo"}</span>
                <span className="text-muted-foreground">Drop or click</span>
              </div>
            )
          }
        </PhotoDropZone>
      )}

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-black text-white ${isTrophy ? "bg-amber-500" : "bg-camp-green"}`}>
            C{cohortNumber}
          </span>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs" maxLength={60}
            placeholder={isTrophy ? "Winning team" : "Month Year"} />
        </div>
        {caption && <p className="text-[11px] text-muted-foreground">{caption}</p>}
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        {photo && !positioning && (
          <div className="flex flex-wrap items-center justify-between gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600 hover:text-red-700" onClick={() => onDelete(photo)} disabled={busy}>
              <Icon icon="trash-2" className="h-3.5 w-3.5" /> Delete
            </Button>
            <div className="flex gap-1">
              {canPosition && (
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPositioning(true)} disabled={busy}>
                  <Icon icon="move" className="h-3.5 w-3.5" /> Reposition
                </Button>
              )}
              {labelChanged && (
                <Button size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => void onSave(base({ label: label.trim() }))}>
                  Save label
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
