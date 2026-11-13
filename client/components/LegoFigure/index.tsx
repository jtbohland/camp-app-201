type Props = {
  src: string;
  alt?: string;
  /** Sizing classes (set the height; width follows the image). */
  className?: string;
  /** Hop on hover of the nearest `group` parent. */
  hop?: boolean;
};

/**
 * A counselor's LEGO minifig, cut out on a transparent background, with a soft LEGO-yellow glow
 * and a ground shadow so it "pops" off the card without being loud.
 */
export default function LegoFigure({ src, alt = "LEGO minifig", className = "h-24", hop = false }: Props) {
  return (
    <div className={`relative flex flex-col items-center ${hop ? "transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:-rotate-3" : ""}`}>
      {/* Warm glow behind the figure */}
      <div className="pointer-events-none absolute inset-x-[-15%] bottom-[10%] top-[15%] rounded-full bg-amber-300/35 blur-xl" />
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`relative z-10 w-auto object-contain [filter:drop-shadow(0_6px_6px_rgba(0,0,0,0.25))_drop-shadow(0_0_1px_rgba(0,0,0,0.35))] ${className}`}
      />
      {/* Ground shadow */}
      <div className="pointer-events-none -mt-1 h-1.5 w-3/5 rounded-[50%] bg-black/20 blur-[2px]" />
    </div>
  );
}
