import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import TeamLogoLightbox from "@/components/TeamLogoLightbox/index.js";

type Props = {
  src: string | null;
  name: string;
  color: string | null;
  size?: "sm" | "md" | "lg";
  /** Click the logo to see it full size. */
  zoomable?: boolean;
};

const SIZES = { sm: "w-7 h-7 text-[10px]", md: "w-12 h-12 text-base", lg: "w-16 h-16 text-lg" };

/** Round team badge. Logos use object-contain on white so they show in full, never cropped. */
export default function TeamLogoBadge({ src, name, color, size = "md", zoomable = false }: Props) {
  const [open, setOpen] = useState(false);
  const dims = SIZES[size];
  if (src) {
    const badge = (
      <div className={`${dims} shrink-0 rounded-full bg-white border-2 border-white shadow overflow-hidden flex items-center justify-center`}>
        <img src={src} alt={name} className="w-full h-full object-contain" />
      </div>
    );
    if (!zoomable) return badge;
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="View logo full size"
          aria-label={`View ${name} logo full size`}
          className="group relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {badge}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Icon icon="zoom-in" className="h-3 w-3" />
          </span>
        </button>
        <TeamLogoLightbox logo={open ? { src, name, color } : null} onClose={() => setOpen(false)} />
      </>
    );
  }
  return (
    <div
      className={`${dims} shrink-0 rounded-full flex items-center justify-center text-white font-bold shadow`}
      style={{ backgroundColor: color || "#2d6a4f" }}
    >
      {(name || "T").slice(0, 2).toUpperCase()}
    </div>
  );
}
