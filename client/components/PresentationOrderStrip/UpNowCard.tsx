import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";

type Props = {
  team: { name: string; logo_url: string | null; color: string | null };
  position: number;
  total: number;
};

/** Big "Up now" callout for the team that's presenting. */
export default function UpNowCard({ team, position, total }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-indigo-300 bg-white px-4 py-3 shadow-sm">
      <TeamLogoBadge src={team.logo_url} name={team.name} color={team.color} size="lg" zoomable />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">🎤 Up now · {position} of {total}</p>
        <p className="truncate text-xl font-black text-foreground">{team.name}</p>
      </div>
    </div>
  );
}
