type Props = {
  rank: number;
  name: string;
  memberCount: number;
  totalPoints: number;
  avgPoints: number;
  checkinRate: number;
};

const RANK_COLORS = ["bg-amber-500", "bg-gray-400", "bg-amber-700"];

/** Rank, name, total points and the 3 stat chips at the top of a Hub team table. */
export default function AdminTeamHeader({ rank, name, memberCount, totalPoints, avgPoints, checkinRate }: Props) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${RANK_COLORS[rank - 1] ?? "bg-emerald-600"}`}>
            {rank}
          </div>
          <div>
            <h3 className="font-bold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{memberCount} members</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-emerald-700">{totalPoints}</div>
          <div className="text-[10px] text-muted-foreground">total pts</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-emerald-50 rounded-lg p-2">
          <div className="text-sm font-semibold text-emerald-800">{avgPoints}</div>
          <div className="text-[10px] text-muted-foreground">Avg pts</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="text-sm font-semibold text-blue-800">{checkinRate}%</div>
          <div className="text-[10px] text-muted-foreground">Check-in rate</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2">
          <div className="text-sm font-semibold text-purple-800">{memberCount}</div>
          <div className="text-[10px] text-muted-foreground">Members</div>
        </div>
      </div>
    </>
  );
}
