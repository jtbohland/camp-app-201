import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";

export default function TeamHistoryPage() {
  const user = useSuperblocksUser();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

  const { data, loading, fetching, refetch } = useApiData("GetTeamHistory", {
    search: search.trim() || null,
  });

  const teams = data?.teams ?? [];
  const allNames = data?.all_names ?? [];

  // Group by cohort year
  const grouped = useMemo(() => {
    const map = new Map<number, typeof teams>();
    for (const team of teams) {
      const arr = map.get(team.cohort_year) ?? [];
      arr.push(team);
      map.set(team.cohort_year, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [teams]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Icon icon="archive" className="w-6 h-6 text-amber-400" />
            Team History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allNames.length} team{allNames.length !== 1 ? "s" : ""} across all cohorts
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-amber-600 hover:bg-amber-700">
            <Icon icon={showAdd ? "x" : "plus"} className="w-4 h-4 mr-1.5" />
            {showAdd ? "Cancel" : "Add Historical Team"}
          </Button>
        )}
      </div>

      {/* Search + Dedup checker */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Icon icon="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams or check for duplicates..."
              className="pl-9 bg-muted/30"
            />
          </div>
        </div>
        {search.trim() && allNames.some(n => n.toLowerCase() === search.toLowerCase()) && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
            <Icon icon="alert-circle" className="w-3.5 h-3.5" />
            "{search}" is already taken! Choose a different name.
          </p>
        )}
        {search.trim() && !allNames.some(n => n.toLowerCase() === search.toLowerCase()) && (
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
            <Icon icon="check-circle" className="w-3.5 h-3.5" />
            "{search}" is available!
          </p>
        )}
      </Card>

      {/* Add form */}
      {showAdd && <AddTeamForm onSuccess={() => { setShowAdd(false); refetch(); }} />}

      {/* Teams by year */}
      <div className={`space-y-6 ${fetching ? "opacity-70" : ""}`}>
        {grouped.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon icon="history" className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mt-2">
              {search ? "No matches found" : "No historical teams recorded yet"}
            </p>
          </Card>
        ) : (
          grouped.map(([year, yearTeams]) => (
            <div key={year}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {year} Cohort{yearTeams.length > 0 ? ` • ${yearTeams[0].cohort_name}` : ""}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {yearTeams.map((team) => (
                  <Card key={team.id} className="p-4 flex items-start gap-3">
                    {/* Logo/avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{
                        backgroundColor: team.color_hex ? `${team.color_hex}20` : "rgba(245,158,11,0.1)",
                        color: team.color_hex ?? "#f59e0b",
                        border: `2px solid ${team.color_hex ?? "#f59e0b"}40`,
                      }}
                    >
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        team.team_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{team.team_name}</h3>
                      {team.mascot && (
                        <p className="text-xs text-muted-foreground">{team.mascot}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{team.members_count} members</span>
                        {team.final_points > 0 && <span>{team.final_points} pts</span>}
                        {team.placement && (
                          <span className={team.placement === 1 ? "text-amber-400 font-bold" : ""}>
                            #{team.placement}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddTeamForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [mascot, setMascot] = useState("");
  const [colorHex, setColorHex] = useState("#f59e0b");
  const [logoUrl, setLogoUrl] = useState("");
  const [cohortName, setCohortName] = useState("");
  const [cohortYear, setCohortYear] = useState(new Date().getFullYear().toString());
  const [members, setMembers] = useState("4");
  const [points, setPoints] = useState("0");
  const [placement, setPlacement] = useState("");
  const { run: addTeam, loading } = useApi("AddTeamHistory");

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !cohortName.trim()) {
      toast.error("Team name and cohort name are required");
      return;
    }
    try {
      const result = await addTeam({
        team_name: name.trim(),
        logo_url: logoUrl.trim() || null,
        mascot: mascot.trim() || null,
        color_hex: colorHex || null,
        cohort_name: cohortName.trim(),
        cohort_year: Number(cohortYear),
        members_count: Number(members) || 0,
        final_points: Number(points) || 0,
        placement: placement ? Number(placement) : null,
      });
      if (result?.success) {
        toast.success("Team added to history!");
        onSuccess();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [name, mascot, colorHex, logoUrl, cohortName, cohortYear, members, points, placement, addTeam, onSuccess]);

  return (
    <Card className="p-5 border-amber-700/30 bg-amber-900/10">
      <h3 className="text-sm font-semibold text-foreground mb-3">Add Historical Team</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Team Name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team Awesome" className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mascot</label>
          <Input value={mascot} onChange={(e) => setMascot(e.target.value)} placeholder="The Wolves" className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cohort Name *</label>
          <Input value={cohortName} onChange={(e) => setCohortName(e.target.value)} placeholder="Spring 2024" className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cohort Year</label>
          <Input value={cohortYear} onChange={(e) => setCohortYear(e.target.value)} type="number" className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Color</label>
          <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} type="color" className="bg-muted/30 h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Logo URL</label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Members</label>
          <Input value={members} onChange={(e) => setMembers(e.target.value)} type="number" className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Final Points</label>
          <Input value={points} onChange={(e) => setPoints(e.target.value)} type="number" className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Placement</label>
          <Input value={placement} onChange={(e) => setPlacement(e.target.value)} type="number" placeholder="1" className="bg-muted/30" />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={loading || !name.trim()} className="mt-4 bg-amber-600 hover:bg-amber-700">
        {loading ? "Adding..." : "Add Team"}
      </Button>
    </Card>
  );
}
