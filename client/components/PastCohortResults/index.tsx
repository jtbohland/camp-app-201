import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";

/** Read-only results for a closed cohort: final team standings, cAMP Champ, and cAMP-V-P. */
export default function PastCohortResults() {
  const { data: status, loading: loadingStatus } = useApiData("GetCloseCampStatus", {}, { staleTime: 30_000 });
  const { data: board, loading: loadingBoard } = useApiData("GetLeaderboard", {}, { staleTime: 30_000 });

  if (loadingStatus || loadingBoard) return <Skeleton className="h-64 rounded-xl max-w-2xl" />;

  const teams = (board?.teams ?? []).filter((t) => t.name !== "TEST");
  const champId = status?.camp_champ_team_id ?? null;
  const vpId = status?.camp_vp_camper_id ?? null;
  const vp = (board?.campers ?? []).find((c) => c.id === vpId) ?? null;

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Icon icon="trophy" className="w-5 h-5 text-amber-600" />
        Final results
      </h2>

      <Card className="p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">cAMP-V-P</h3>
        {vp ? (
          <p className="text-sm text-foreground flex items-center gap-2">
            <Icon icon="crown" className="w-4 h-4 text-amber-500" />
            <span className="font-semibold">{vp.first_name} {vp.last_name}</span>
            <span className="text-muted-foreground">· {vp.points} pts</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Not recorded for this cohort.</p>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Team standings</h3>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams in this cohort.</p>
        ) : (
          <ol className="space-y-2">
            {teams.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <span className="font-medium text-foreground">{t.name}</span>
                  {t.id === champId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">cAMP Champ</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{t.total_points} pts</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {status?.legacy_wall_cohort_number != null && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Icon icon="landmark" className="w-3.5 h-3.5" />
          On the Legacy Wall as cAMP #{status.legacy_wall_cohort_number}
        </p>
      )}
    </div>
  );
}
