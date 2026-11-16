import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { resizeImageToDataUrl } from "@/lib/resizeImage";

type ImageUploadProps = {
  value: string; // base64 data URI or URL
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  shape?: "circle" | "square";
  maxSizeMB?: number;
  /** GIFs aren't resized, so they get their own (smaller) limit. Defaults to maxSizeMB. */
  maxGifSizeMB?: number;
  /** Shrink photos so the longest side is at most this many px before saving (GIFs are left as-is). */
  resizeTo?: number;
  className?: string;
};

export default function ImageUpload({
  value,
  onChange,
  label = "Upload Image",
  hint = "Drag & drop or click to upload (PNG, JPG, GIF, WebP)",
  shape = "square",
  maxSizeMB = 2,
  maxGifSizeMB,
  resizeTo,
  className = "",
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      // Validate type
      const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        setError("Please upload a PNG, JPG, GIF, WebP, or SVG file");
        return;
      }

      // Validate size
      const isGif = file.type === "image/gif";
      const limit = isGif ? maxGifSizeMB ?? maxSizeMB : maxSizeMB;
      if (file.size > limit * 1024 * 1024) {
        setError(isGif ? `GIFs must be under ${limit}MB` : `Image must be under ${limit}MB`);
        return;
      }

      if (resizeTo && file.type !== "image/svg+xml") {
        setProcessing(true);
        resizeImageToDataUrl(file, resizeTo, 0.88)
          .then(onChange)
          .catch(() => setError("Couldn't read that image. Try a JPG or PNG."))
          .finally(() => setProcessing(false));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
      };
      reader.onerror = () => setError("Failed to read file");
      reader.readAsDataURL(file);
    },
    [onChange, maxSizeMB, maxGifSizeMB, resizeTo]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset so same file can be re-selected
      e.target.value = "";
    },
    [processFile]
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setError(null);
  }, [onChange]);

  const isCircle = shape === "circle";
  const shapeClasses = isCircle ? "rounded-full" : "rounded-xl";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      {value ? (
        /* Preview mode */
        <div className="relative group inline-block">
          <img
            src={value}
            alt="Upload preview"
            className={`${isCircle ? "w-24 h-24" : "w-full h-32"} object-cover border-2 border-border ${shapeClasses}`}
          />
          <button
            type="button"
            onClick={handleRemove}
            className={`absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md`}
            title="Remove image"
          >
            <Icon icon="x" className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : processing ? (
        <div className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border ${isCircle ? "w-24 h-24" : "w-full h-32"} ${shapeClasses}`}>
          <Icon icon="loader-circle" className="w-6 h-6 animate-spin text-muted-foreground" />
          {!isCircle && <span className="text-xs text-muted-foreground">Preparing photo…</span>}
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed transition-colors
            ${isCircle ? "w-24 h-24" : "w-full h-32"}
            ${shapeClasses}
            ${isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
            }
          `}
        >
          <Icon
            icon="upload"
            className={`${isDragging ? "text-primary" : "text-muted-foreground"} ${isCircle ? "w-5 h-5" : "w-6 h-6"}`}
          />
          {!isCircle && (
            <span className="text-xs text-muted-foreground text-center px-3">{hint}</span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <Icon icon="alert-circle" className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
