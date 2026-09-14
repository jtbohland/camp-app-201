import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import type { IconName } from "lucide-react/dynamic";

interface Props {
  camperId: number;
}

export default function AdminCloseCamp({ camperId }: Props) {
  const [confirming, setConfirming] = useState(false);

  const { data: status, fetching, refetch } = useApiData("GetCloseCampStatus", {}, { staleTime: 5000 });
  const { run: closeCamp, loading: closing } = useApi("CloseCamp");
  const { run: revealTeam, loading: revealing } = useApi("RevealTeamStanding");
  const { run: revealVP, loading: revealingVP } = useApi("RevealCampVP");

  const campClosed = status?.camp_closed ?? false;
  const readyToClose = status?.camp_ready_to_close ?? false;
  const revealedTeamIds = status?.revealed_team_ids ?? [];
  const vpRevealed = status?.vp_revealed ?? false;

  const handleClose = useCallback(async () => {
    try {
      const result = await closeCamp({ closer_camper_id: camperId });
      if (result?.already_closed) {
        toast.info("cAMP was already closed.");
      } else {
        toast.success(result?.message ?? "🏕️ cAMP closed!");
      }
      setConfirming(false);
      await refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Error: " + message);
    }
  }, [closeCamp, camperId, refetch]);

  const handleRevealTeam = useCallback(async (teamId: number) => {
    try {
      await revealTeam({ team_id: teamId });
      await refetch();
      toast.success("Team revealed! 🎉");
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Error: " + message);
    }
  }, [revealTeam, refetch]);

  const handleRevealVP = useCallback(async () => {
    try {
      await revealVP({});
      await refetch();
      toast.success("cAMP-V-P revealed! 👑");
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Error: " + message);
    }
  }, [revealVP, refetch]);

  // Get team standings for reveal controls
  const { data: leaderboard } = useApiData("GetLeaderboard", {}, { enabled: campClosed, staleTime: 10000 });
  const teamStandings = (leaderboard as any)?.team_leaderboard ?? [];

  const statusItems: { icon: IconName; label: string; done: boolean }[] = [
    { icon: "clipboard-check", label: `Mini EBR: ${status?.scores_submitted ?? 0}/${status?.scores_needed ?? 0} rubrics`, done: readyToClose || campClosed },
    { icon: "lock", label: "Points frozen", done: campClosed },
    { icon: "trophy", label: "Winners calculated", done: campClosed },
    { icon: "award", label: "Badges awarded", done: campClosed },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Icon icon="flag" className="w-5 h-5 text-amber-600" />
        Close cAMP
      </h2>

      {/* Status Card */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Close Readiness</h3>
        <div className="space-y-2">
          {statusItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.done ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                <Icon icon={item.done ? "check" : item.icon} className="w-3 h-3" />
              </div>
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Close Button */}
      {!campClosed && (
        <Card className="p-4">
          {!confirming ? (
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              disabled={!readyToClose}
              onClick={() => setConfirming(true)}
            >
              <Icon icon="flag" className="w-4 h-4 mr-2" />
              {readyToClose ? "Close cAMP" : "Waiting for Mini EBR rubrics..."}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <strong>This cannot be undone.</strong> All points freeze and winners are calculated immediately.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)} disabled={closing}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={handleClose} disabled={closing}>
                  {closing ? <><Icon icon="loader-2" className="w-4 h-4 mr-1 animate-spin" /> Closing...</> : "Confirm — Close cAMP"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Post-Close: Podium Reveal Controls */}
      {campClosed && (
        <Card className="p-4 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <span className="text-base">🏆</span> Podium Ceremony
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Reveal teams last→first, then cAMP-V-P. Leaderboards are hidden until revealed.
          </p>

          {/* Team Reveals (sorted last to first) */}
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">cAMP Champ — Team Standings</h4>
            {teamStandings.length > 0 ? (
              [...teamStandings].reverse().map((team: any, idx: number) => {
                const rank = teamStandings.length - idx;
                const isRevealed = revealedTeamIds.includes(team.team_id);
                return (
                  <div key={team.team_id} className="flex items-center justify-between bg-background rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{rank}</span>
                      <span className="text-sm font-medium">{team.team_name}</span>
                      {isRevealed && <span className="text-xs text-emerald-600">✓ Revealed</span>}
                    </div>
                    <Button
                      size="sm"
                      variant={isRevealed ? "ghost" : "outline"}
                      disabled={isRevealed || revealing}
                      onClick={() => handleRevealTeam(team.team_id)}
                    >
                      {isRevealed ? "Shown" : "Reveal"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">Loading team standings...</p>
            )}
          </div>

          {/* cAMP-V-P Reveal */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">cAMP-V-P</h4>
            <Button
              className={vpRevealed
                ? "w-full bg-emerald-100 text-emerald-700 cursor-default"
                : "w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white hover:from-yellow-500 hover:to-amber-600"
              }
              disabled={vpRevealed || revealingVP}
              onClick={handleRevealVP}
            >
              {vpRevealed ? (
                <><Icon icon="check" className="w-4 h-4 mr-1" /> cAMP-V-P Revealed</>
              ) : (
                <><Icon icon="crown" className="w-4 h-4 mr-1" /> Reveal cAMP-V-P 👑</>
              )}
            </Button>
          </div>
        </Card>
      )}

      {fetching && <p className="text-xs text-muted-foreground text-center">Refreshing status...</p>}
    </div>
  );
}
