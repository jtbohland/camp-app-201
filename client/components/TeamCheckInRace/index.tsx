import { Icon } from "@/components/ui/icon";

export type TeamProgress = {
  team_id: number;
  team_name: string;
  checked_in: number;
  total_members: number;
  all_in: boolean;
  excused_members?: string[];
};

/** Live team race during a check-in. Excused members count toward their team (0 solo points). */
export default function TeamCheckInRace({ teams }: { teams: TeamProgress[] }) {
  if (teams.length === 0) return null;
  return (
    <div className="w-full max-w-lg bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Icon icon="trophy" className="w-4 h-4 text-camp-amber" />
        Team Race
      </h3>
      <div className="flex flex-col gap-2">
        {teams.map((team, idx) => {
          const excused = team.excused_members ?? [];
          return (
            <div key={team.team_id} className={`p-2 rounded-lg ${team.all_in ? "bg-green-50 border border-green-200" : "bg-muted/50"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {team.all_in && idx === 0 && <span className="text-lg">🏆</span>}
                  <span className="text-sm font-medium text-foreground">{team.team_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${team.all_in ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${team.total_members > 0 ? (team.checked_in / team.total_members) * 100 : 0}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono font-bold ${team.all_in ? "text-green-600" : "text-muted-foreground"}`}>
                    {team.checked_in}/{team.total_members}
                  </span>
                  {team.all_in && <Icon icon="check-circle" className="w-4 h-4 text-green-600" />}
                </div>
              </div>
              {excused.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {excused.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700"
                      title="Counts toward the team. No solo points."
                    >
                      <Icon icon="calendar-x" className="w-3 h-3" />
                      {name} · Excused Absence
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
