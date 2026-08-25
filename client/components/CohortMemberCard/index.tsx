import { Icon } from "@/components/ui/icon";

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
};

type CohortMemberCardProps = {
  member: CohortMember;
};

export default function CohortMemberCard({ member }: CohortMemberCardProps) {
  const isCounselor = member.role === "counselor" || member.role === "admin";

  return (
    <div className={`flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isCounselor ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
      {/* Photo + Name header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.first_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">
              {member.first_name[0]}{member.last_name[0]}
            </span>
          )}
        </div>
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
        {member.region && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
            <Icon icon="globe" className="w-3 h-3" />
            {member.region}
          </span>
        )}
        {member.role && !isCounselor && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
            <Icon icon="briefcase" className="w-3 h-3" />
            {member.role}
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
    </div>
  );
}
