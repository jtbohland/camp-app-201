// Shared country → flag emoji + background color map
// Used by Hall of Fame (PastCampsGallery) and Cohort Tab (CohortMemberCard)

export const COUNTRY_FLAGS: Record<string, { flag: string; bg: string; text: string }> = {
  "United States":       { flag: "🇺🇸", bg: "bg-blue-100",    text: "text-blue-800" },
  "Australia":           { flag: "🇦🇺", bg: "bg-sky-100",     text: "text-sky-800" },
  "Brazil":              { flag: "🇧🇷", bg: "bg-green-100",   text: "text-green-800" },
  "France":              { flag: "🇫🇷", bg: "bg-indigo-100",  text: "text-indigo-800" },
  "Germany":             { flag: "🇩🇪", bg: "bg-amber-100",   text: "text-amber-800" },
  "India":               { flag: "🇮🇳", bg: "bg-orange-100",  text: "text-orange-800" },
  "Japan":               { flag: "🇯🇵", bg: "bg-red-100",     text: "text-red-800" },
  "Netherlands":         { flag: "🇳🇱", bg: "bg-orange-100",  text: "text-orange-800" },
  "the Netherlands":     { flag: "🇳🇱", bg: "bg-orange-100",  text: "text-orange-800" },
  "Saudi Arabia":        { flag: "🇸🇦", bg: "bg-emerald-100", text: "text-emerald-800" },
  "Singapore":           { flag: "🇸🇬", bg: "bg-red-100",     text: "text-red-800" },
  "South Korea":         { flag: "🇰🇷", bg: "bg-blue-100",    text: "text-blue-800" },
  "United Arab Emirates":{ flag: "🇦🇪", bg: "bg-emerald-100", text: "text-emerald-800" },
  "the United Arab Emirates": { flag: "🇦🇪", bg: "bg-emerald-100", text: "text-emerald-800" },
  "United Kingdom":      { flag: "🇬🇧", bg: "bg-rose-100",    text: "text-rose-800" },
  "the United Kingdom":  { flag: "🇬🇧", bg: "bg-rose-100",    text: "text-rose-800" },
  "Canada":              { flag: "🇨🇦", bg: "bg-red-100",     text: "text-red-800" },
  "Turkey":              { flag: "🇹🇷", bg: "bg-red-100",     text: "text-red-800" },
  "Israel":              { flag: "🇮🇱", bg: "bg-blue-100",    text: "text-blue-800" },
  "Mexico":              { flag: "🇲🇽", bg: "bg-green-100",   text: "text-green-800" },
  "Spain":               { flag: "🇪🇸", bg: "bg-red-100",     text: "text-red-800" },
  "Italy":               { flag: "🇮🇹", bg: "bg-green-100",   text: "text-green-800" },
  "Ireland":             { flag: "🇮🇪", bg: "bg-emerald-100", text: "text-emerald-800" },
  "Colombia":            { flag: "🇨🇴", bg: "bg-yellow-100",  text: "text-yellow-800" },
};

// Common aliases → canonical name
const COUNTRY_ALIASES: Record<string, string> = {
  "USA": "United States",
  "US": "United States",
  "U.S.": "United States",
  "U.S.A.": "United States",
  "UK": "United Kingdom",
  "U.K.": "United Kingdom",
  "UAE": "United Arab Emirates",
  "U.A.E.": "United Arab Emirates",
  "S. Korea": "South Korea",
  "KSA": "Saudi Arabia",
};

const DEFAULT_COUNTRY = { flag: "🌍", bg: "bg-gray-100", text: "text-gray-700" };

export function getCountryStyle(country: string | null | undefined) {
  if (!country) return null;
  const canonical = COUNTRY_ALIASES[country] ?? country;
  return COUNTRY_FLAGS[canonical] ?? COUNTRY_FLAGS[`the ${canonical}`] ?? { ...DEFAULT_COUNTRY, flag: "🌍" };
}

/** Return the display name (canonical) for a country, resolving aliases */
export function getCountryDisplayName(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_ALIASES[country] ?? country;
}

export function formatTenure(startDate: string | null | undefined): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return "Starting soon";
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} at Amplitude`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} at Amplitude`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? "s" : ""} at Amplitude`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths > 0) return `${years}y ${remainingMonths}m at Amplitude`;
  return `${years} year${years !== 1 ? "s" : ""} at Amplitude`;
}
