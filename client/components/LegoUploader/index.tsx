import { useCallback, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi.js";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { shrinkImage, readFileAsDataUrl } from "@/lib/cropImage.js";
import LegoFigure from "@/components/LegoFigure/index.js";

type Props = {
  currentLegoUrl: string | null;
  onSaved: () => void;
};

/**
 * Counselor Cabin: upload a photo of your LEGO minifig (a transparent PNG looks best, but any
 * photo works). It stands in the corner of your counselor card and glows + hops on hover.
 */
export default function LegoUploader({ currentLegoUrl, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string | null>(null);
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
      const src = await readFileAsDataUrl(file);
      setPending(await shrinkImage(src, { maxSize: 480, keepAlpha: file.type !== "image/jpeg" }));
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

  const handleSave = useCallback(async (value: string | null) => {
    try {
      await saveLego({ lego_data: value });
      toast.success(value ? "Your LEGO Me is live on your counselor card!" : "LEGO Me removed");
      setPending(null);
      onSaved();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
      toast.error("Couldn't save: " + message);
    }
  }, [saveLego, onSaved]);

  const shown = pending ?? currentLegoUrl;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon icon="blocks" className="h-4 w-4 text-amber-500" />
            My LEGO Me
          </h3>
          <p className="text-xs text-muted-foreground">
            Upload a photo of your minifig. A transparent PNG looks best. It glows and hops when someone hovers your card.
          </p>
        </div>
        {currentLegoUrl && !pending && (
          <Button variant="ghost" size="sm" onClick={() => void handleSave(null)} disabled={saving}>
            <Icon icon="trash-2" className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>

      <div className="flex items-center gap-5">
        {shown && (
          <div className="group flex shrink-0 flex-col items-center gap-1 px-3 pb-2 pt-1" title="Hover to preview">
            <LegoFigure src={shown} size="md" hop />
            <span className="mt-2 text-[10px] text-muted-foreground">{pending ? "Preview · hover me" : "Hover me"}</span>
          </div>
        )}

        {pending ? (
          <div className="flex flex-1 flex-col gap-2 sm:max-w-[220px]">
            <Button size="sm" onClick={() => void handleSave(pending)} disabled={saving}>
              {saving ? "Saving…" : "Save to my card"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={saving}>
              Choose a different photo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setPending(null); setError(null); }} disabled={saving}>
              Cancel
            </Button>
          </div>
        ) : (
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
        )}
      </div>

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
