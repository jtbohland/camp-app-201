import { Badge } from "@/components/ui/badge";
import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";

export type WheelLeader = {
  camper_id: number;
  first_name: string;
  last_name: string;
  team_name: string | null;
  team_color: string | null;
  team_logo: string | null;
  pitch_count: number;
  avg_self_score: number;
  avg_room_score: number;
  avg_delta: number | null;
  spot_on_count: number;
  total_points: number;
};

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function gapClass(delta: number | null): string {
  if (delta === null) return "text-muted-foreground";
  if (delta <= 1) return "text-emerald-600";
  if (delta <= 3) return "text-amber-600";
  return "text-rose-600";
}

function StatusBadge({ leader }: { leader: WheelLeader }) {
  if (leader.avg_delta === null) {
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">No self-eval</Badge>;
  }
  if (leader.spot_on_count > 0) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px]">
        🎯 Spot on{leader.spot_on_count > 1 ? ` ×${leader.spot_on_count}` : ""}
      </Badge>
    );
  }
  if (leader.avg_delta <= 1) {
    return <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px]">Self-aware</Badge>;
  }
  if (leader.avg_self_score > leader.avg_room_score) {
    return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">Scored high</Badge>;
  }
  return <Badge className="bg-violet-100 text-violet-800 border border-violet-300 text-[10px]">Too modest</Badge>;
}

export default function WheelLeaderRow({ leader, rank }: { leader: WheelLeader; rank: number }) {
  const top = rank <= 3 && leader.avg_delta !== null;
  return (
    <tr className={top ? "bg-blue-50/40" : ""}>
      <td className="text-center px-3 py-2.5 font-bold">
        {top ? <span className="text-lg">{MEDALS[rank]}</span> : <span className="text-muted-foreground">{rank}</span>}
      </td>
      <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">
        {leader.first_name} {leader.last_name}
      </td>
      <td className="px-3 py-2.5">
        {leader.team_name ? (
          <div className="flex items-center gap-2 min-w-0">
            <TeamLogoBadge src={leader.team_logo} name={leader.team_name} color={leader.team_color} size="sm" />
            <span className="text-xs text-muted-foreground truncate">{leader.team_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="text-center px-3 py-2.5">{leader.pitch_count}</td>
      <td className="text-center px-3 py-2.5">{leader.avg_delta === null ? "—" : leader.avg_self_score}</td>
      <td className="text-center px-3 py-2.5">{leader.avg_room_score}</td>
      <td className={`text-center px-3 py-2.5 font-bold ${gapClass(leader.avg_delta)}`}>
        {leader.avg_delta === null ? "—" : leader.avg_delta}
      </td>
      <td className="text-center px-3 py-2.5 font-semibold text-blue-700">{leader.total_points}</td>
      <td className="text-center px-3 py-2.5">
        <StatusBadge leader={leader} />
      </td>
    </tr>
  );
}
