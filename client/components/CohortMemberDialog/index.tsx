import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";
import RegionPill from "@/components/RegionPill/index.js";
import { getCountryStyle, getCountryDisplayName, formatTenure } from "@/lib/countryUtils.js";
import { getRoleStyle, isCounselorRole, mapToStandardRole } from "@/lib/roles.js";
import type { CohortMember } from "@/lib/cohortMember.js";

type Props = {
  member: CohortMember | null;
  onClose: () => void;
};

function Detail({ icon, label, value }: { icon: Parameters<typeof Icon>[0]["icon"]; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
      <Icon icon={icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

/** The bigger, easier-to-read view of a Cohort page tile. */
export default function CohortMemberDialog({ member, onClose }: Props) {
  if (!member) return null;
  const isCounselor = isCounselorRole(member.role);
  const roleStyle = getRoleStyle(member.role);
  const fullRole = mapToStandardRole(member.role) ?? member.role;
  const countryStyle = getCountryStyle(member.country);
  const countryName = getCountryDisplayName(member.country)?.replace(/^the /, "") ?? null;
  const tenure = formatTenure(member.start_date);
  const place = [member.city, countryName].filter(Boolean).join(", ");
  const name = `${member.first_name} ${member.last_name}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header band */}
        <div className={`flex flex-col items-center gap-3 px-6 pt-8 pb-5 ${roleStyle.bg}`}>
          <CamperAvatar email={member.email} photoUrl={member.photo_url} name={name} size="xl" className="ring-4 ring-background shadow-md" />
          <div className="text-center">
            <DialogTitle className="text-2xl font-bold">{name}</DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {isCounselor ? "cAMP Counselor" : fullRole ?? "cAMPer"}
            </DialogDescription>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {!isCounselor && member.role && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleStyle.pill}`}>
                <Icon icon="briefcase" className="h-3.5 w-3.5" />
                {roleStyle.text}
              </span>
            )}
            {countryName && countryStyle && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${countryStyle.bg} ${countryStyle.text}`}>
                {countryStyle.flag} {countryName}
              </span>
            )}
            {!isCounselor && <RegionPill region={member.region} country={member.country} size="md" />}
            {member.team_name && !isCounselor && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: member.team_color ? `${member.team_color}25` : undefined, color: member.team_color || undefined }}
              >
                <Icon icon="flag" className="h-3.5 w-3.5" />
                {member.team_name}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6 pt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {member.manager && !isCounselor && <Detail icon="user-round-check" label="Manager" value={member.manager} />}
            {place && <Detail icon="map-pin" label="Based in" value={place} />}
            {tenure && <Detail icon="clock" label="Time at Amplitude" value={tenure} />}
            <Detail
              icon="mail"
              label="Email"
              value={
                <a href={`mailto:${member.email}`} className="text-primary hover:underline">
                  {member.email}
                </a>
              }
            />
            {member.linkedin_url && (
              <Detail
                icon="linkedin"
                label="LinkedIn"
                value={
                  <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    View profile
                  </a>
                }
              />
            )}
          </div>

          {member.fun_fact && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                <Icon icon="sparkles" className="h-3.5 w-3.5" />
                Fun fact
              </p>
              <p className="text-base italic leading-relaxed text-foreground/90">"{member.fun_fact}"</p>
            </div>
          )}

          {member.bio?.trim() && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">About</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{member.bio}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
