import { canonicalCountry } from "./countries.js";

/**
 * The three cAMP regions. Keep in sync with camp201_map_region() (migration 0019).
 * 🌎 NAMER (blue) · 🌍 EMEA (red) · 🌏 APAC (green). Latin America rolls up to NAMER.
 */
export const REGIONS = ["NAMER", "EMEA", "APAC"] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_STYLES: Record<Region, { globe: string; pill: string }> = {
  NAMER: { globe: "🌎", pill: "bg-blue-100 text-blue-800" },
  EMEA: { globe: "🌍", pill: "bg-red-100 text-red-800" },
  APAC: { globe: "🌏", pill: "bg-green-100 text-green-800" },
};

const REGION_ALIASES: Record<string, Region> = {
  namer: "NAMER", na: "NAMER", "north america": "NAMER", amer: "NAMER", americas: "NAMER", latam: "NAMER",
  "latin america": "NAMER", "south america": "NAMER",
  emea: "EMEA", europe: "EMEA", eu: "EMEA", uki: "EMEA", "middle east": "EMEA", africa: "EMEA",
  apac: "APAC", apj: "APAC", asia: "APAC", "asia pacific": "APAC", anz: "APAC",
};

const COUNTRY_REGION: Record<string, Region> = {};
const add = (region: Region, names: string) => names.split("|").forEach((n) => (COUNTRY_REGION[n] = region));
add("NAMER", "United States|Canada|Mexico|Brazil|Argentina|Chile|Colombia|Peru|Costa Rica|Puerto Rico|Uruguay|Ecuador|Venezuela|Guatemala|Panama|Dominican Republic");
add("APAC", "Australia|New Zealand|Japan|South Korea|China|Hong Kong|Taiwan|Singapore|India|Indonesia|Malaysia|Philippines|Thailand|Vietnam|Pakistan|Bangladesh|Sri Lanka");
add("EMEA", "United Kingdom|Ireland|France|Germany|Spain|Italy|Netherlands|Belgium|Switzerland|Austria|Sweden|Norway|Denmark|Finland|Poland|Portugal|Czechia|Hungary|Romania|Greece|Israel|United Arab Emirates|Saudi Arabia|Qatar|Turkey|Egypt|South Africa|Nigeria|Kenya");

/** NAMER / EMEA / APAC from a stored region, falling back to the country. */
export function getRegion(region: string | null | undefined, country?: string | null): Region | null {
  const fromCountry = COUNTRY_REGION[canonicalCountry(country) ?? ""];
  if (fromCountry) return fromCountry;
  const r = (region ?? "").trim();
  if (!r) return null;
  return (REGIONS as readonly string[]).includes(r.toUpperCase()) ? (r.toUpperCase() as Region) : REGION_ALIASES[r.toLowerCase()] ?? null;
}
