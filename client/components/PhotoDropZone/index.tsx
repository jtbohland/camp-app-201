import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { resizeImageToDataUrl } from "@/lib/resizeImage.js";

type Props = {
  /** Called with a resized JPEG data URL. */
  onPhoto: (dataUrl: string) => void;
  onError?: (message: string) => void;
  /** Longest side after resizing. Group photos need more detail than avatars. */
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  /** Render prop gets `dragging` so callers can style the drop state. */
  children: (state: { dragging: boolean }) => ReactNode;
};

/** A click-or-drop area for one photo. Shrinks it before handing it back. */
export default function PhotoDropZone({ onPhoto, onError, maxSize = 1600, disabled, className = "", children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (file: File) => {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        onError?.("Use a PNG, JPG, or WebP photo");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        onError?.("Photo must be under 25MB");
        return;
      }
      resizeImageToDataUrl(file, maxSize, 0.85)
        .then(onPhoto)
        .catch(() => onError?.("Couldn't read that photo"));
    },
    [maxSize, onPhoto, onError]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (disabled) return;
      const f = e.dataTransfer.files?.[0];
      if (f) handle(f);
    },
    [disabled, handle]
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) inputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={className}
    >
      {children({ dragging })}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
