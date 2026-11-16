import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";
import { useApi } from "@/hooks/useApi.js";
import { useApiData } from "@/hooks/useApiData.js";
import { errorMessage } from "@/lib/cohortRefresh";

/**
 * Counselor-only Best Logo tie-breaker. Only appears when cAMPers tied for 1st. Each counselor gets one
 * vote; most votes wins, and if counselors tie, the team that got a vote first wins.
 */
export default function LogoTiebreaker() {
  const { data, refetch } = useApiData("GetLogoTiebreaker", {}, { refetchInterval: 20_000 });
  const { run: vote, loading } = useApi("SubmitLogoTiebreakerVote");
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const needsMyVote = !!data?.active && data.my_vote === null;
  // Pops up on its own the first time a counselor needs to vote.
  useEffect(() => {
    if (needsMyVote && !dismissed) setOpen(true);
  }, [needsMyVote, dismissed]);

  const handleVote = useCallback(async () => {
    if (choice === null) return;
    try {
      const res = await vote({ team_id: choice });
      if (res?.success) toast.success(res.message);
      else toast.info(res?.message ?? "Vote not counted");
      setOpen(false);
      await Promise.all([refetch(), queryClient.invalidateQueries("GetTeamVotes")]);
    } catch (e) {
      toast.error("Couldn't save your vote: " + errorMessage(e));
    }
  }, [choice, vote, refetch]);

  if (!data?.active) return null;
  const winner = data.teams.find((t) => t.id === data.winner_team_id) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
        <span className="flex items-center gap-1.5">
          <Icon icon="scale" className="h-3.5 w-3.5" />
          <b>Counselor tie-breaker:</b> {data.votes_cast}/{data.counselors} counselors voted
          {winner ? ` · ${winner.name} leads for Best Logo` : ""}
        </span>
        {needsMyVote ? (
          <Button size="sm" onClick={() => setOpen(true)} className="bg-violet-600 text-white hover:bg-violet-700">Cast my vote</Button>
        ) : (
          <span className="font-medium">You voted ✓</span>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDismissed(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>🏆 Best Logo tie-breaker</DialogTitle>
            <DialogDescription>
              cAMPers tied for 1st. Both teams keep their 1st-place points. Each counselor gets one vote to pick Best Logo.
              If counselors tie too, the team that got a vote first wins. Only counselors see this.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {data.teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setChoice(t.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  choice === t.id ? "border-violet-500 bg-violet-50" : "border-border hover:border-violet-300"
                }`}
              >
                <TeamLogoBadge src={t.logo_url} name={t.name} color={t.color} size="lg" />
                <span className="text-sm font-semibold text-foreground">{t.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Later</Button>
            <Button onClick={handleVote} disabled={choice === null || loading} className="bg-violet-600 text-white hover:bg-violet-700">
              {loading ? "Saving…" : "Cast my vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
