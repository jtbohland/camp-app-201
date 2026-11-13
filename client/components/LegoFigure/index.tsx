type Size = "sm" | "md" | "lg";

type Props = {
  src: string;
  alt?: string;
  size?: Size;
  /** Hop + brighter glow on hover of the nearest `group` parent. */
  hop?: boolean;
};

const HEIGHTS: Record<Size, string> = {
  sm: "h-20 max-w-[5rem]",
  md: "h-24 max-w-[7rem]",
  lg: "h-36 max-w-[9rem]",
};

/**
 * A counselor's LEGO Me standing on the card: soft LEGO-yellow glow behind it and a ground shadow
 * so it pops off the card. Works for a transparent cut-out or a regular photo (shown with rounded corners).
 */
export default function LegoFigure({ src, alt = "LEGO minifig", size = "md", hop = false }: Props) {
  return (
    <div
      className={`relative flex origin-bottom items-end justify-center transition-transform duration-300 ${HEIGHTS[size]} ${
        hop ? "group-hover:scale-110" : ""
      }`}
    >
      {/* Warm glow behind the figure */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-b from-yellow-200 to-transparent opacity-50 blur-xl transition-opacity duration-300 ${hop ? "group-hover:opacity-90" : ""}`}
      />
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`relative h-full w-auto max-w-full rounded-lg object-contain drop-shadow-[0_0_6px_rgba(250,204,21,0.45)] transition-[filter] duration-300 ${
          hop ? "group-hover:animate-bounce group-hover:drop-shadow-[0_0_14px_rgba(250,204,21,0.9)]" : ""
        }`}
      />
      {/* Ground shadow */}
      <div className="absolute -bottom-2 left-1/2 h-3 w-3/4 -translate-x-1/2 rounded-full bg-black/20 blur-md" />
    </div>
  );
}
