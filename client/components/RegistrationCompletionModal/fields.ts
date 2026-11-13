import { STANDARD_ROLES, type StandardRole } from "@/lib/roles.js";
import { getRegion, type Region } from "@/lib/regions.js";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The registration fields a cAMPer fills in themselves (the PIN is generated on save). */
export type RegValues = {
  first_name: string;
  last_name: string;
  role: StandardRole | "";
  manager_email: string;
  region: Region | "";
  country: string;
  city: string;
  start_date: string;
};

export type RegField = keyof RegValues;

export const FIELD_LABELS: Record<RegField, string> = {
  first_name: "First name",
  last_name: "Last name",
  role: "Role",
  manager_email: "Manager's work email",
  region: "Region",
  country: "Country",
  city: "City",
  start_date: "Official Amplitude start date",
};

type SavedCamper = {
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  manager_email?: string | null;
  region: string | null;
  country: string | null;
  city: string | null;
  start_date: string | null;
};

/** Start from what's on file, normalized to the form's allowed values. */
export function valuesFrom(c: SavedCamper): RegValues {
  const role = c.role && (STANDARD_ROLES as readonly string[]).includes(c.role) ? (c.role as StandardRole) : "";
  return {
    first_name: (c.first_name ?? "").trim(),
    last_name: (c.last_name ?? "").trim(),
    role,
    manager_email: (c.manager_email ?? "").trim().toLowerCase(),
    region: getRegion(c.region, c.country) ?? "",
    country: (c.country ?? "").trim(),
    city: (c.city ?? "").trim(),
    start_date: (c.start_date ?? "").slice(0, 10),
  };
}

/** Is this field filled in with a value registration will accept? */
export function isFilled(field: RegField, v: RegValues): boolean {
  if (field === "manager_email") return EMAIL_RE.test(v.manager_email.trim());
  if (field === "start_date") return /^\d{4}-\d{2}-\d{2}$/.test(v.start_date);
  return !!String(v[field]).trim();
}

export const ALL_FIELDS: RegField[] = ["first_name", "last_name", "role", "manager_email", "region", "country", "city", "start_date"];

/** Fields the cAMPer must fill in: blank or not in an accepted format. */
export function fieldsToAsk(v: RegValues): RegField[] {
  return ALL_FIELDS.filter((f) => !isFilled(f, v));
}
