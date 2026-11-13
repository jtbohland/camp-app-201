import { memo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";
import LegoFigure from "@/components/LegoFigure/index.js";
import RegionPill from "@/components/RegionPill/index.js";
import { getCountryStyle, getCountryDisplayName, formatTenure } from "@/lib/countryUtils.js";
import { getRoleStyle, isCounselorRole } from "@/lib/roles.js";
import type { CohortMember } from "@/lib/cohortMember.js";

type CohortMemberCardProps = {
  member: CohortMember;
  /** Opens the larger pop-up (Cohort page) or the report card (Counselor Hub). */
  onOpen?: (member: CohortMember) => void;
  /** Extra pills (e.g. counselor-only flags) shown after the standard pills. */
  extraPills?: React.ReactNode;
};

function CohortMemberCard({ member, onOpen, extraPills }: CohortMemberCardProps) {
  const isCounselor = isCounselorRole(member.role);
  const roleStyle = getRoleStyle(member.role);
  const countryStyle = getCountryStyle(member.country);
  const countryName = getCountryDisplayName(member.country);
  const tenure = formatTenure(member.start_date);
  const bio = member.bio?.trim() ?? "";
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioIsLong = bio.length > 220;
  const clickable = !!onOpen;
  const lego = isCounselor ? member.lego_url : null;

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onOpen(member) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(member);
              }
            }
          : undefined
      }
      className={`group relative flex flex-col border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all text-left ${roleStyle.bg} ${roleStyle.border} ${isCounselor ? "ring-1 ring-primary/20" : ""} ${clickable ? "cursor-pointer hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
    >
      {/* Counselor LEGO Me: a LEGO-brick display frame in the top-right, pops on hover */}
      {lego && (
        <div className="pointer-events-none absolute right-3 top-3 z-10" title={`${member.first_name}'s LEGO Me`}>
          <LegoFigure src={lego} alt={`${member.first_name}'s LEGO minifig`} size="md" hop />
        </div>
      )}
      {/* Photo + Name header (leaves room for the LEGO frame) */}
      <div className={`flex items-center gap-3 p-4 ${lego ? "pr-36" : ""}`}>
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
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Icon icon="external-link" className="w-3 h-3" />
              LinkedIn
            </a>
          )}
        </div>
        {clickable && !lego && <Icon icon="maximize-2" className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
      </div>

      {/* Pills */}
      <div className={`flex flex-wrap gap-1.5 px-4 pb-3 ${lego ? "pr-36" : ""}`}>
        {member.role && !isCounselor && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${roleStyle.pill}`}
            title={member.role}
          >
            <Icon icon="briefcase" className="w-3 h-3" />
            {roleStyle.text || member.role}
          </span>
        )}
        {countryName && countryStyle && (
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${countryStyle.bg} ${countryStyle.text}`}>
            {countryStyle.flag} {countryName.replace(/^the /, "")}
          </span>
        )}
        {!isCounselor && <RegionPill region={member.region} country={member.country} />}
        {/* Counselors aren't on a team and don't have a manager here */}
        {member.manager && !isCounselor && (
          <span
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium"
            title="Manager"
          >
            <Icon icon="user-round-check" className="w-3 h-3" />
            Mgr: {member.manager}
          </span>
        )}
        {member.team_name && !isCounselor && (
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
        {extraPills}
      </div>

      {/* Bio: counselors only (cAMPer bios stay in their profile) */}
      {isCounselor && bio && (
        <div className={`px-4 pb-3 ${lego ? "pt-6" : ""}`}>
          <p className={`whitespace-pre-line text-xs leading-relaxed text-foreground/80 ${bioExpanded ? "" : "line-clamp-4"}`}>
            {bio}
          </p>
          {bioIsLong && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBioExpanded((v) => !v);
              }}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              {bioExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Fun fact */}
      {member.fun_fact && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
            Fun fact
          </p>
          <p className="text-xs text-foreground/70 italic line-clamp-2">
            "{member.fun_fact}"
          </p>
        </div>
      )}

      {/* Tenure */}
      {tenure && (
        <div className="px-4 pb-3 mt-auto">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Icon icon="clock" className="w-3 h-3" />
            {tenure}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(CohortMemberCard);
