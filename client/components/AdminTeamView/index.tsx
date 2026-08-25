import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  cohortId: number | null;
  onCamperClick: (camperId: number) => void;
}

export default function AdminTeamView({ cohortId, onCamperClick }: Props) {
  const { data: teamsData, loading } = useApiData("GetAdminTeams", {
    cohort_id: cohortId,
  });
  const { data: campersData } = useApiData("GetAdminCampers", {
    cohort_id: cohortId,
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const teams = teamsData?.teams ?? [];
  const campers = campersData?.campers ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {teams.map((team, index) => {
        const teamMembers = campers.filter((c) => c.team_name === team.name);
        return (
          <Card key={team.id} className="p-5 bg-white/95 border-0 shadow-lg">
            {/* Team Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  index === 0 ? "bg-amber-500" :
                  index === 1 ? "bg-gray-400" :
                  index === 2 ? "bg-amber-700" : "bg-emerald-600"
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{team.name}</h3>
                  <p className="text-xs text-gray-500">{team.member_count} members</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-700">{team.total_points}</div>
                <div className="text-[10px] text-gray-500">total pts</div>
              </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-emerald-50 rounded-lg p-2">
                <div className="text-sm font-semibold text-emerald-800">{team.avg_points}</div>
                <div className="text-[10px] text-gray-500">Avg pts</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-sm font-semibold text-blue-800">{team.checkin_rate}%</div>
                <div className="text-[10px] text-gray-500">Check-in rate</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-2">
                <div className="text-sm font-semibold text-purple-800">{team.member_count}</div>
                <div className="text-[10px] text-gray-500">Members</div>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => onCamperClick(member.id)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-emerald-700">
                        {member.first_name[0]}{member.last_name[0]}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700">
                      {member.first_name} {member.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-emerald-700">{member.points} pts</span>
                    <Icon name="chevron-right" className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No members assigned</p>
              )}
            </div>
          </Card>
        );
      })}

      {teams.length === 0 && (
        <div className="col-span-full text-center py-16 text-white/60">
          <Icon name="flag" className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No teams in this cohort yet</p>
        </div>
      )}
    </div>
  );
}
