type Size = "sm" | "md" | "lg";

type Props = {
  src: string;
  alt?: string;
  size?: Size;
  /** Straighten + lift on hover of the nearest `group` parent. */
  hop?: boolean;
};

const SIZES: Record<Size, { frame: string; stud: string; studs: number }> = {
  sm: { frame: "w-20", stud: "h-2.5 w-2.5", studs: 3 },
  md: { frame: "w-28", stud: "h-3 w-3", studs: 4 },
  lg: { frame: "w-40", stud: "h-4 w-4", studs: 4 },
};

/**
 * A counselor's LEGO Me in a LEGO-brick display frame: a yellow tile with studs on top.
 * Works for any upload: a transparent cut-out floats on the yellow, a regular photo fills the frame.
 * Slight tilt; straightens and lifts on hover.
 */
export default function LegoFigure({ src, alt = "LEGO minifig", size = "md", hop = false }: Props) {
  const s = SIZES[size];
  return (
    <div
      className={`relative ${s.frame} rotate-3 ${hop ? "transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:rotate-0 group-hover:scale-105" : ""}`}
    >
      {/* Studs */}
      <div className="flex justify-evenly px-1.5">
        {Array.from({ length: s.studs }).map((_, i) => (
          <span
            key={i}
            className={`${s.stud} -mb-0.5 rounded-t-[3px] bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]`}
          />
        ))}
      </div>
      {/* Brick */}
      <div className="rounded-lg bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-500 p-1.5 shadow-[0_6px_14px_-4px_rgba(180,120,0,0.55),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(0,0,0,0.12)]">
        <div className="aspect-[4/5] overflow-hidden rounded-md bg-gradient-to-b from-amber-50 to-yellow-100 ring-1 ring-black/10">
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
