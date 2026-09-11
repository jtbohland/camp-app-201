import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";

type Leader = {
  camper_id: number;
  first_name: string;
  last_name: string;
  team_name: string | null;
  team_color: string | null;
  pitch_count: number;
  avg_self_score: number;
  avg_room_score: number;
  total_points: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function WheelLeaderboard() {
  const { data, loading } = useApiData("GetWheelLeaderboard", {}, { staleTime: 15_000 });
  const leaders: Leader[] = data?.leaders ?? [];

  if (loading) return <Skeleton className="h-40 rounded-xl" />;
  if (leaders.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed">
        <div className="text-3xl mb-2">🎡</div>
        <p className="text-sm text-muted-foreground">No pitches yet — be the first!</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon icon="trophy" className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Pitch Leaderboard</h3>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 gap-y-2 items-center text-[10px] font-bold uppercase text-muted-foreground mb-2 px-1">
        <div className="w-6" />
        <div>Pitcher</div>
        <div className="text-center w-12">Pitches</div>
        <div className="text-center w-14">Self Avg</div>
        <div className="text-center w-14">Room Avg</div>
        <div className="text-center w-14">Points</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5">
        {leaders.map((l, i) => (
          <div
            key={l.camper_id}
            className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 items-center px-2 py-2 rounded-lg ${
              i < 3 ? "bg-amber-50/60" : "hover:bg-muted/30"
            }`}
          >
            <div className="w-6 text-center text-sm font-bold">
              {i < 3 ? MEDALS[i] : <span className="text-muted-foreground">{i + 1}</span>}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate">{l.first_name} {l.last_name}</span>
              {l.team_name && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate"
                  style={{
                    backgroundColor: l.team_color ? `${l.team_color}20` : undefined,
                    color: l.team_color || undefined,
                  }}
                >
                  {l.team_name}
                </span>
              )}
            </div>
            <div className="text-center w-12">
              <Badge variant="outline" className="text-[11px] px-1.5">{l.pitch_count}</Badge>
            </div>
            <div className="text-center w-14">
              <span className="text-sm font-semibold text-blue-600">{l.avg_self_score || "—"}</span>
              <span className="text-[9px] text-muted-foreground">/15</span>
            </div>
            <div className="text-center w-14">
              <span className="text-sm font-semibold text-purple-600">{l.avg_room_score || "—"}</span>
              <span className="text-[9px] text-muted-foreground">/15</span>
            </div>
            <div className="text-center w-14">
              <span className="text-sm font-bold text-amber-600">{l.total_points}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
