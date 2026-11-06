type Props = {
  src: string | null;
  name: string;
  color: string | null;
  size?: "md" | "lg";
};

const SIZES = { md: "w-12 h-12 text-base", lg: "w-16 h-16 text-lg" };

/** Round team badge. Logos use object-contain on white so they show in full, never cropped. */
export default function TeamLogoBadge({ src, name, color, size = "md" }: Props) {
  const dims = SIZES[size];
  if (src) {
    return (
      <div className={`${dims} shrink-0 rounded-full bg-white border-2 border-white shadow overflow-hidden flex items-center justify-center`}>
        <img src={src} alt={name} className="w-full h-full object-contain" />
      </div>
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
