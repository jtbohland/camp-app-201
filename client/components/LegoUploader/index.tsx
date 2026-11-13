import { useCallback, useRef, useState, type DragEvent, type PointerEvent } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi.js";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import { cropToAspect, readFileAsDataUrl } from "@/lib/cropImage.js";
import LegoFigure from "@/components/LegoFigure/index.js";

type Props = {
  currentLegoUrl: string | null;
  onSaved: () => void;
};

/** Same shape as the LEGO frame on the card. */
const ASPECT = 4 / 5;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Counselor Cabin: upload any photo of your LEGO minifig (regular photo or transparent PNG).
 * Drag to frame it and zoom in, with a live preview of the LEGO-brick frame on your card.
 */
export default function LegoUploader({ currentLegoUrl, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const [original, setOriginal] = useState<{ src: string; keepAlpha: boolean } | null>(null);
  const [focus, setFocus] = useState({ x: 50, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run: saveLego, loading: saving } = useApi("SaveCounselorLego");

  const pickFile = useCallback(async (file: File) => {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPG, or WebP photo");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Photo must be under 15MB");
      return;
    }
    try {
      setOriginal({ src: await readFileAsDataUrl(file), keepAlpha: file.type !== "image/jpeg" });
      setFocus({ x: 50, y: 40 });
      setZoom(1);
    } catch {
      setError("Failed to read that file");
    }
  }, []);

  const onDropFile = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void pickFile(f);
  }, [pickFile]);

  // Drag the photo to reframe (zoom makes the drag move further across the photo).
  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: focus.x, fy: focus.y };
  }, [focus]);
  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    const dx = ((e.clientX - d.x) / box.clientWidth) * 100 / zoom;
    const dy = ((e.clientY - d.y) / box.clientHeight) * 100 / zoom;
    setFocus({ x: clamp(d.fx - dx), y: clamp(d.fy - dy) });
  }, [zoom]);
  const endDrag = useCallback(() => { drag.current = null; }, []);

  const handleSave = useCallback(async (remove = false) => {
    try {
      const value = remove || !original
        ? null
        : await cropToAspect(original.src, { aspect: ASPECT, focusX: focus.x, focusY: focus.y, zoom, outWidth: 480, keepAlpha: original.keepAlpha });
      await saveLego({ lego_data: value });
      toast.success(value ? "Your LEGO Me is live on your counselor card!" : "LEGO Me removed");
      setOriginal(null);
      onSaved();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
      toast.error("Couldn't save: " + message);
    }
  }, [original, focus, zoom, saveLego, onSaved]);

  // Preview the crop with CSS (same math as cropToAspect: object-position + scale from the anchor).
  const previewStyle = {
    objectPosition: `${focus.x}% ${focus.y}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focus.x}% ${focus.y}%`,
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon icon="blocks" className="h-4 w-4 text-amber-500" />
            My LEGO Me
          </h3>
          <p className="text-xs text-muted-foreground">
            Upload any photo of your minifig, with or without a background. You can drag and zoom to frame it.
          </p>
        </div>
        {currentLegoUrl && !original && (
          <Button variant="ghost" size="sm" onClick={() => void handleSave(true)} disabled={saving}>
            <Icon icon="trash-2" className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>

      {!original ? (
        <div className="flex items-center gap-5">
          {currentLegoUrl && (
            <div className="shrink-0 px-2 pt-1">
              <LegoFigure src={currentLegoUrl} size="sm" />
            </div>
          )}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDropFile}
            className={`flex h-28 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs transition-colors ${
              dragging ? "border-amber-400 bg-amber-50" : "border-border hover:border-amber-300 hover:bg-amber-50/40"
            }`}
          >
            <Icon icon="image-plus" className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">{currentLegoUrl ? "Replace your LEGO Me" : "Drop a photo of your minifig"}</span>
            <span className="text-muted-foreground">or click to choose · PNG, JPG, WebP</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row">
          {/* Framing area */}
          <div className="flex-1 space-y-3">
            <div
              ref={boxRef}
              className="relative mx-auto w-full max-w-[240px] cursor-grab touch-none select-none overflow-hidden rounded-lg bg-gradient-to-b from-amber-50 to-yellow-100 ring-2 ring-amber-400 active:cursor-grabbing"
              style={{ aspectRatio: "4 / 5" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img src={original.src} alt="Frame your minifig" draggable={false} className="pointer-events-none h-full w-full object-cover" style={previewStyle} />
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
                  <Icon icon="move" className="h-3 w-3" /> Drag to frame
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Icon icon="zoom-out" className="h-4 w-4 text-muted-foreground" />
              <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0] ?? 1)} className="flex-1" />
              <Icon icon="zoom-in" className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Card preview */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-card p-4 ring-1 ring-border sm:w-48">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">On your card</p>
            <div className="group py-2">
              {/* Live preview of the frame using the same crop */}
              <div className="relative w-28 rotate-3 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-0 group-hover:scale-105">
                <div className="flex justify-evenly px-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="-mb-0.5 h-3 w-3 rounded-t-[3px] bg-gradient-to-b from-yellow-300 to-yellow-500" />
                  ))}
                </div>
                <div className="rounded-lg bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-500 p-1.5 shadow-[0_6px_14px_-4px_rgba(180,120,0,0.55)]">
                  <div className="aspect-[4/5] overflow-hidden rounded-md bg-gradient-to-b from-amber-50 to-yellow-100 ring-1 ring-black/10">
                    <img src={original.src} alt="" className="h-full w-full object-cover" style={previewStyle} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : "Save to my card"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setOriginal(null); setError(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <Icon icon="triangle-alert" className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
