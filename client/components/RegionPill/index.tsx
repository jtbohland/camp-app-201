import { getRegion, REGION_STYLES } from "@/lib/regions.js";

type Props = {
  region: string | null | undefined;
  country?: string | null;
  size?: "sm" | "md";
};

/** 🌎 NAMER (blue) · 🌍 EMEA (red) · 🌏 APAC (green). Renders nothing when the region is unknown. */
export default function RegionPill({ region, country, size = "sm" }: Props) {
  const r = getRegion(region, country);
  if (!r) return null;
  const style = REGION_STYLES[r];
  const sizing = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizing} ${style.pill}`} title="Region">
      <span aria-hidden>{style.globe}</span>
      {r}
    </span>
  );
}
