import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useApiData } from "@/hooks/useApiData.js";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminTeamGenerator() {
  const [numTeams, setNumTeams] = useState(4);
  const { run: generateTeams, loading: generating } = useApi("AutoGenerateTeams");
  const { data: teamsData, refetch: refetchTeams } = useApiData("GetTeams", {});
  const { data: camperData } = useApiData("GetRegisteredCampers", {});

  const existingTeams = teamsData?.teams ?? [];
  const campers = camperData?.campers ?? [];
  const camperCount = campers.filter((c: any) => c.role !== "counselor" && c.role !== "admin").length;

  const handleGenerate = useCallback(async () => {
    try {
      const result = await generateTeams({ num_teams: numTeams });
      if (result?.success) {
        toast.success(result.message);
        refetchTeams();
      } else {
        toast.error(result?.message ?? "Failed to generate teams");
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Error: " + message);
    }
  }, [numTeams, generateTeams, refetchTeams]);

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <Icon icon="shuffle" className="w-5 h-5" />
        Auto-Generate Teams
      </h2>
      <p className="text-sm text-white/60 mb-5">
        Creates balanced teams by distributing campers across regions and roles. Same-region
        and same-role campers get split up for maximum diversity.
      </p>

      {existingTeams.length > 0 ? (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
          <p className="text-sm text-amber-300 flex items-center gap-2">
            <Icon icon="alert-triangle" className="w-4 h-4" />
            {existingTeams.length} team{existingTeams.length !== 1 ? "s" : ""} already exist.
            Teams must be deleted before regenerating.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-white/80 mb-1 block">Number of teams</label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumTeams(n)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                      numTeams === n
                        ? "bg-emerald-600 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-white/50 ml-4">
              <p>{camperCount} campers registered</p>
              <p>≈ {Math.ceil(camperCount / numTeams)} per team</p>
            </div>
          </div>

          {/* Region/role distribution preview */}
          {camperCount > 0 && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/40 mb-1">Distribution preview:</p>
              <p className="text-xs text-white/70">
                Campers will be sorted by region, then interleaved across {numTeams} teams
                so each team gets a mix of regions and roles.
              </p>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || camperCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white self-start"
          >
            {generating ? (
              <>
                <Icon icon="loader-2" className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Icon icon="shuffle" className="w-4 h-4 mr-2" />
                Generate {numTeams} Teams
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
