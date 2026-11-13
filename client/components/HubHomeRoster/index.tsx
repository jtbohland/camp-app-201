import { Card } from "@/components/ui/card";
import TeamMemberPill from "@/components/TeamMemberPill/index.js";
import type { HubMember } from "@/lib/teamHub";

type Company = { name: string; emoji?: string; industry?: string; color?: string } | null;

type Props = {
  members: HubMember[];
  myCamperId: number | null;
  company: Company;
  rank: number | null;
  totalTeams: number;
  totalPoints: number;
  presentingSlot: { label: string | null; position: number; total: number } | null;
};

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** Who's on the team, where the team stands, and which customer it's working on. */
export default function HubHomeRoster({ members, myCamperId, company, rank, totalTeams, totalPoints, presentingSlot }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="p-4 md:col-span-2">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Your team ({members.length})</h3>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <TeamMemberPill
              key={m.id}
              firstName={m.first_name}
              lastName={m.last_name}
              points={m.points}
              role={m.role}
              country={m.country}
              isMe={m.id === myCamperId}
            />
          ))}
        </div>
        {company && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="text-lg" aria-hidden="true">{company.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Your customer: {company.name}</p>
              {company.industry && <p className="text-xs text-muted-foreground">{company.industry}</p>}
            </div>
          </div>
        )}
      </Card>

      <Card className="flex flex-col justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted-foreground">cAMP Champ standing</p>
          <p className="text-2xl font-bold text-foreground">
            {rank ? ordinal(rank) : "—"}
            <span className="ml-1 text-sm font-normal text-muted-foreground">of {totalTeams}</span>
          </p>
          <p className="text-sm text-muted-foreground">{totalPoints} team points</p>
        </div>
        {presentingSlot && (
          <div className="rounded-md bg-primary/10 px-3 py-2">
            <p className="text-xs text-muted-foreground">{presentingSlot.label ?? "Presenting order"}</p>
            <p className="text-sm font-semibold text-foreground">
              You present {ordinal(presentingSlot.position)} of {presentingSlot.total}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
