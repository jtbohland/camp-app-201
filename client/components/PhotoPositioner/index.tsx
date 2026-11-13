import { useCallback, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Props = {
  src: string;
  /** Starting anchor (percent). */
  focusX: number;
  focusY: number;
  /** Matches where the photo is shown, so the preview crops the same way. */
  aspect: string;
  saving?: boolean;
  onSave: (focus: { x: number; y: number }) => void;
  onCancel: () => void;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Click and drag a photo to choose which part shows when it's cropped to fit (e.g. keep faces in frame).
 * Saves an anchor point as percentages, applied with CSS object-position.
 */
export default function PhotoPositioner({ src, focusX, focusY, aspect, saving, onSave, onCancel }: Props) {
  const [focus, setFocus] = useState({ x: focusX, y: focusY });
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: focus.x, fy: focus.y };
  }, [focus]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    // Dragging the photo right reveals more of its left side, so the anchor moves the opposite way.
    const dx = ((e.clientX - d.x) / box.clientWidth) * 100;
    const dy = ((e.clientY - d.y) / box.clientHeight) * 100;
    setFocus({ x: clamp(d.fx - dx), y: clamp(d.fy - dy) });
  }, []);

  const endDrag = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        className="relative cursor-grab touch-none select-none overflow-hidden rounded-lg bg-black ring-2 ring-camp-green active:cursor-grabbing"
        style={{ aspectRatio: aspect }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={src}
          alt="Drag to reposition"
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
            <Icon icon="move" className="h-3 w-3" /> Drag to choose what shows
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setFocus({ x: 50, y: 40 })}>
          Reset
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => onSave(focus)}>
            {saving ? "Saving…" : "Save position"}
          </Button>
        </div>
      </div>
    </div>
  );
}
