import { useState, useCallback, useMemo } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useApiData } from "@/hooks/useApiData.js";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import CompanyAssignment from "./CompanyAssignment";
import TeamCountButton from "./TeamCountButton";
import EligibilitySummary from "./EligibilitySummary";
import { recommendedTeamCount, teamCountOptions, teamSizeLabel } from "./teamSizing";

export default function AdminTeamGenerator() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const { run: generateTeams, loading: generating } = useApi("AutoGenerateTeams");
  const { data: teamsData, refetch: refetchTeams } = useApiData("GetTeams", {});
  // Same rule the generator uses: Accepted (or signed up but not on the list), minus counselors.
  const { data: preview, refetch: refetchPreview } = useApiData("GetTeamGeneratorPreview", {});

  const existingTeams = teamsData?.teams ?? [];
  const camperCount = preview?.eligible_count ?? 0;
  const recommended = useMemo(() => recommendedTeamCount(camperCount), [camperCount]);
  const options = useMemo(() => teamCountOptions(camperCount), [camperCount]);

  const handleGenerate = useCallback(async () => {
    if (pendingCount === null) return;
    try {
      const result = await generateTeams({ num_teams: pendingCount });
      if (result?.success) {
        toast.success(result.message);
        refetchTeams();
        refetchPreview();
      } else {
        toast.error(result?.message ?? "Failed to generate teams");
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Error: " + message);
    } finally {
      setPendingCount(null);
    }
  }, [pendingCount, generateTeams, refetchTeams, refetchPreview]);

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
        <Icon icon="shuffle" className="w-5 h-5" />
        Auto-Generate Teams
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Creates balanced teams from confirmed cAMPers (Accepted in Cohort Management), spread across regions and roles. Counselors are never put on a team.
      </p>

      {existingTeams.length > 0 ? (
        <CompanyAssignment teams={existingTeams} onChanged={refetchTeams} />
      ) : (
        <div className="flex flex-col gap-4">
          {preview ? (
            <EligibilitySummary
              eligibleCount={preview.eligible_count}
              acceptedCount={preview.accepted_count}
              counselorCount={preview.counselor_count}
              notOnList={preview.signed_up_not_on_list}
              leftOut={preview.left_out}
            />
          ) : (
            <div className="h-5 w-48 rounded bg-muted animate-pulse" />
          )}

          {camperCount < 4 ? (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              You need at least 4 confirmed cAMPers (not counselors) to create 2 teams.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              {options.map((n) => (
                <TeamCountButton
                  key={n}
                  teams={n}
                  headcount={camperCount}
                  recommended={n === recommended}
                  disabled={generating}
                  onClick={setPendingCount}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={pendingCount !== null} onOpenChange={(open) => !open && !generating && setPendingCount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {pendingCount} teams?</DialogTitle>
            <DialogDescription>
              {camperCount} confirmed cAMPers will be split into {pendingCount} teams
              ({pendingCount ? teamSizeLabel(camperCount, pendingCount) : ""} per team), balanced by region and role.
              Counselors stay off teams. To redo it later, you'll need to delete the teams first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingCount(null)} disabled={generating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {generating ? (
                <><Icon icon="loader-circle" className="w-4 h-4 animate-spin mr-2" />Creating…</>
              ) : (
                <>Create {pendingCount} teams</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
