import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi.js";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import { readFileAsDataUrl, removeBackground, shrinkPng } from "@/lib/removeBackground.js";
import LegoFigure from "@/components/LegoFigure/index.js";

type Props = {
  currentLegoUrl: string | null;
  onSaved: () => void;
};

/** Checkerboard so transparent areas read as "transparent" in the preview. */
const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

/**
 * Counselor Cabin: upload a photo of your LEGO minifig. The background is removed in the browser
 * (best on a plain backdrop), with a strength slider and a before/after preview before saving.
 */
export default function LegoUploader({ currentLegoUrl, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [cutout, setCutout] = useState<string | null>(null);
  const [strength, setStrength] = useState(0.5);
  const [keepBackground, setKeepBackground] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const { run: saveLego, loading: saving } = useApi("SaveCounselorLego");

  // Re-run background removal whenever the photo or strength changes.
  useEffect(() => {
    if (!original) return;
    let cancelled = false;
    setProcessing(true);
    setError(null);
    const t = setTimeout(() => {
      const job = keepBackground ? shrinkPng(original).then((d) => ({ dataUrl: d, removed: 0 })) : removeBackground(original, strength);
      job
        .then((r) => {
          if (cancelled) return;
          setCutout(r.dataUrl);
          if (!keepBackground && r.removed < 0.15) setError("Not much background was found. Try more strength, or a photo on a plain background.");
        })
        .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't process that photo"))
        .finally(() => !cancelled && setProcessing(false));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [original, strength, keepBackground]);

  const pickFile = useCallback(async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPG, or WebP photo");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Photo must be under 15MB");
      return;
    }
    try {
      setOriginal(await readFileAsDataUrl(file));
    } catch {
      setError("Failed to read that file");
    }
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void pickFile(f);
  }, [pickFile]);

  const handleSave = useCallback(async (value: string | null) => {
    try {
      await saveLego({ lego_data: value });
      toast.success(value ? "Your LEGO Me is live on your counselor card!" : "LEGO Me removed");
      setOriginal(null);
      setCutout(null);
      onSaved();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
      toast.error("Couldn't save: " + message);
    }
  }, [saveLego, onSaved]);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon icon="blocks" className="h-4 w-4 text-amber-500" />
            My LEGO Me
          </h3>
          <p className="text-xs text-muted-foreground">
            Snap your minifig on a plain background. We'll cut it out and add it to your counselor card.
          </p>
        </div>
        {currentLegoUrl && !original && (
          <Button variant="ghost" size="sm" onClick={() => void handleSave(null)} disabled={saving}>
            <Icon icon="trash-2" className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>

      {!original ? (
        <div className="flex items-center gap-4">
          {currentLegoUrl && (
            <div className="flex h-28 w-24 shrink-0 items-end justify-center rounded-lg bg-gradient-to-b from-amber-50 to-amber-100/60 pb-1">
              <LegoFigure src={currentLegoUrl} className="h-24" />
            </div>
          )}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex h-28 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs transition-colors ${
              dragging ? "border-amber-400 bg-amber-50" : "border-border hover:border-amber-300 hover:bg-amber-50/40"
            }`}
          >
            <Icon icon="image-plus" className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">{currentLegoUrl ? "Replace your minifig" : "Drop a photo of your minifig"}</span>
            <span className="text-muted-foreground">or click to choose · PNG, JPG, WebP</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Original</p>
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg bg-muted">
                <img src={original} alt="Original" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">On your card</p>
              <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-lg" style={CHECKER}>
                {cutout && <img src={cutout} alt="Cut-out preview" className={`max-h-[90%] max-w-[90%] object-contain drop-shadow-lg ${processing ? "opacity-50" : ""}`} />}
                {processing && <Icon icon="loader-circle" className="absolute h-6 w-6 animate-spin text-muted-foreground" />}
              </div>
            </div>
          </div>

          {!keepBackground && (
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">Cleanup strength</span>
              <Slider value={[strength]} min={0} max={1} step={0.05} onValueChange={(v) => setStrength(v[0] ?? 0.5)} className="flex-1" />
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={keepBackground} onChange={(e) => setKeepBackground(e.target.checked)} />
            My image already has a transparent background (skip cleanup)
          </label>

          {error && (
            <p className="flex items-center gap-1 text-xs text-amber-700">
              <Icon icon="triangle-alert" className="h-3.5 w-3.5" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setOriginal(null); setCutout(null); setError(null); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => cutout && void handleSave(cutout)} disabled={!cutout || processing || saving}>
              {saving ? "Saving…" : "Save to my card"}
            </Button>
          </div>
        </div>
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
