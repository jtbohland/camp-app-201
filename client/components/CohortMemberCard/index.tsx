import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";
import { getCountryStyle, formatTenure } from "@/lib/countryUtils.js";

type CohortMember = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  manager: string | null;
  region: string | null;
  country: string | null;
  city: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  fun_fact: string | null;
  points: number;
  team_id: number | null;
  team_name: string | null;
  team_color: string | null;
  team_logo_url: string | null;
  start_date: string | null;
};

type CohortMemberCardProps = {
  member: CohortMember;
};

// Role → color map for quick visual identification
const ROLE_COLORS: Record<string, { bg: string; border: string; pill: string; text: string }> = {
  // AEs
  "Strategic Enterprise Account Executive": { bg: "bg-blue-50", border: "border-blue-200", pill: "bg-blue-100 text-blue-700", text: "AE – Strategic" },
  "Enterprise Account Executive":           { bg: "bg-blue-50", border: "border-blue-200", pill: "bg-blue-100 text-blue-700", text: "AE – Enterprise" },
  "Emerging Enterprise Account Executive":  { bg: "bg-sky-50",  border: "border-sky-200",  pill: "bg-sky-100 text-sky-700",   text: "AE – Emerging" },
  "Velocity Account Executive":             { bg: "bg-cyan-50", border: "border-cyan-200", pill: "bg-cyan-100 text-cyan-700", text: "AE – Velocity" },
  // SEs
  "Solutions Engineer":                     { bg: "bg-purple-50", border: "border-purple-200", pill: "bg-purple-100 text-purple-700", text: "SE" },
  // SDRs
  "Sales Development Representative":       { bg: "bg-amber-50", border: "border-amber-200", pill: "bg-amber-100 text-amber-700", text: "SDR" },
  // CSMs / TSMs
  "Customer Success Manager":               { bg: "bg-emerald-50", border: "border-emerald-200", pill: "bg-emerald-100 text-emerald-700", text: "CSM" },
  "Technical Success Manager":              { bg: "bg-teal-50", border: "border-teal-200", pill: "bg-teal-100 text-teal-700", text: "TSM" },
  // Managers
  "Area Vice President (AVP)":              { bg: "bg-rose-50", border: "border-rose-200", pill: "bg-rose-100 text-rose-700", text: "AVP" },
  "Sales Manager":                          { bg: "bg-orange-50", border: "border-orange-200", pill: "bg-orange-100 text-orange-700", text: "Sales Mgr" },
  "Partner Sales Manager":                  { bg: "bg-orange-50", border: "border-orange-200", pill: "bg-orange-100 text-orange-700", text: "Partner Mgr" },
  "Renewal Manager":                        { bg: "bg-lime-50", border: "border-lime-200", pill: "bg-lime-100 text-lime-700", text: "Renewal Mgr" },
  // Counselor/admin
  "counselor":                              { bg: "bg-primary/5", border: "border-primary/40", pill: "bg-primary/10 text-primary", text: "Counselor" },
  "admin":                                  { bg: "bg-primary/5", border: "border-primary/40", pill: "bg-primary/10 text-primary", text: "Admin" },
};

const DEFAULT_ROLE_COLOR = { bg: "bg-card", border: "border-border", pill: "bg-secondary text-secondary-foreground", text: "" };

// Keyword-based fallback matching for roles not in the exact map
const ROLE_KEYWORDS: { pattern: RegExp; style: typeof DEFAULT_ROLE_COLOR }[] = [
  { pattern: /account executive/i, style: { bg: "bg-blue-50", border: "border-blue-200", pill: "bg-blue-100 text-blue-700", text: "AE" } },
  { pattern: /solutions? engineer/i, style: { bg: "bg-purple-50", border: "border-purple-200", pill: "bg-purple-100 text-purple-700", text: "SE" } },
  { pattern: /sales dev|sdr/i, style: { bg: "bg-amber-50", border: "border-amber-200", pill: "bg-amber-100 text-amber-700", text: "SDR" } },
  { pattern: /customer success/i, style: { bg: "bg-emerald-50", border: "border-emerald-200", pill: "bg-emerald-100 text-emerald-700", text: "CSM" } },
  { pattern: /technical success/i, style: { bg: "bg-teal-50", border: "border-teal-200", pill: "bg-teal-100 text-teal-700", text: "TSM" } },
  { pattern: /renewal/i, style: { bg: "bg-lime-50", border: "border-lime-200", pill: "bg-lime-100 text-lime-700", text: "Renewal Mgr" } },
  { pattern: /vice president|avp/i, style: { bg: "bg-rose-50", border: "border-rose-200", pill: "bg-rose-100 text-rose-700", text: "AVP" } },
  { pattern: /sales manager|partner.*manager/i, style: { bg: "bg-orange-50", border: "border-orange-200", pill: "bg-orange-100 text-orange-700", text: "Sales Mgr" } },
];

function getRoleStyle(role: string | null) {
  if (!role) return DEFAULT_ROLE_COLOR;
  // Exact match first
  if (ROLE_COLORS[role]) return ROLE_COLORS[role];
  // Keyword fallback
  for (const kw of ROLE_KEYWORDS) {
    if (kw.pattern.test(role)) return kw.style;
  }
  return DEFAULT_ROLE_COLOR;
}

export default function CohortMemberCard({ member }: CohortMemberCardProps) {
  const isCounselor = member.role === "counselor" || member.role === "admin";
  const roleStyle = getRoleStyle(member.role);
  const countryStyle = getCountryStyle(member.country);
  const tenure = formatTenure(member.start_date);

  return (
    <div className={`flex flex-col border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${roleStyle.bg} ${roleStyle.border} ${isCounselor ? "ring-1 ring-primary/20" : ""}`}>
      {/* Photo + Name header */}
      <div className="flex items-center gap-3 p-4">
        <CamperAvatar
          email={member.email}
          photoUrl={member.photo_url}
          name={`${member.first_name} ${member.last_name}`}
          size="md"
        />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {member.first_name} {member.last_name}
            </span>
            {isCounselor && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                Counselor
              </span>
            )}
          </div>
          {member.linkedin_url && (
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Icon icon="external-link" className="w-3 h-3" />
              LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {/* Role pill — always show with role-specific color */}
        {member.role && !isCounselor && (
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${roleStyle.pill}`}>
            <Icon icon="briefcase" className="w-3 h-3" />
            {roleStyle.text || member.role}
          </span>
        )}
        {member.country && countryStyle && (
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${countryStyle.bg} ${countryStyle.text}`}>
            {countryStyle.flag} {member.country.replace(/^the /, "")}
          </span>
        )}
        {member.manager && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            <Icon icon="user" className="w-3 h-3" />
            {member.manager}
          </span>
        )}
        {member.team_name && (
          <span
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: member.team_color ? `${member.team_color}20` : undefined,
              color: member.team_color || undefined,
            }}
          >
            <Icon icon="flag" className="w-3 h-3" />
            {member.team_name}
          </span>
        )}
      </div>

      {/* Fun fact */}
      {member.fun_fact && (
        <div className="px-4 pb-3">
          <p className="text-xs text-foreground/70 italic line-clamp-2">
            "{member.fun_fact}"
          </p>
        </div>
      )}

      {/* Tenure */}
      {tenure && (
        <div className="px-4 pb-3">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Icon icon="clock" className="w-3 h-3" />
            {tenure}
          </span>
        </div>
      )}
    </div>
  );
}
