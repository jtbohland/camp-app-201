import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type Props = {
  presentationId: number;
  camperId: number;
  camperTeamId: number;
  isAdmin: boolean;
};

export default function HackathonShowcase({ presentationId, camperId, camperTeamId, isAdmin }: Props) {
  const { data, loading, refetch } = useApiData("GetHackathonResults", {
    presentation_id: presentationId,
    camper_id: camperId,
  });
  const { run: saveSubmission, loading: saving } = useApi("SaveHackathonSubmission");
  const { run: castVote, loading: voting } = useApi("SubmitHackathonVote");
  const { run: closeHackathon, loading: closing } = useApi("CloseHackathon");
  const [hackathonClosed, setHackathonClosed] = useState(false);

  const [tab, setTab] = useState<"submit" | "vote">("submit");
  const [form, setForm] = useState({
    app_name: "", description: "", use_case: "", how_it_works: "", who_uses_it: "", app_link: "",
  });
  const [formLoaded, setFormLoaded] = useState(false);

  const submissions = (data?.submissions ?? []) as any[];
  const myVote = data?.my_vote_team_id ?? null;
  const totalVoters = data?.total_voters ?? 0;
  const totalCampers = data?.total_campers ?? 1;
  const mySubmission = submissions.find((s: any) => s.team_id === camperTeamId);

  // Load existing submission into form
  if (mySubmission && !formLoaded) {
    setForm({
      app_name: mySubmission.app_name, description: mySubmission.description,
      use_case: mySubmission.use_case, how_it_works: mySubmission.how_it_works,
      who_uses_it: mySubmission.who_uses_it, app_link: mySubmission.app_link,
    });
    setFormLoaded(true);
  }

  const handleSave = useCallback(async () => {
    if (!form.app_name.trim()) { toast.error("Give your app a name!"); return; }
    try {
      await saveSubmission({
        presentation_id: presentationId, team_id: camperTeamId, camper_id: camperId, ...form,
        app_link: form.app_link || null,
      });
      toast.success("Submission saved!");
      refetch();
    } catch (err) { toast.error(String(err)); }
  }, [form, presentationId, camperTeamId, camperId, saveSubmission, refetch]);

  const handleVote = useCallback(async (teamId: number) => {
    try {
      const res = await castVote({ presentation_id: presentationId, camper_id: camperId, team_id: teamId });
      if (res?.success) { toast.success(res.message); refetch(); }
      else toast.error(res?.message ?? "Failed");
    } catch (err) { toast.error(String(err)); }
  }, [presentationId, camperId, castVote, refetch]);

  const handleCloseHackathon = useCallback(async () => {
    try {
      const res = await closeHackathon({ presentation_id: presentationId, awarded_by: camperId }) as any;
      toast.success(`🏆 ${res.winning_team_name} wins! +${res.team_points} team pts · ${res.members_awarded} Innovation badges awarded`);
      setHackathonClosed(true);
      refetch();
    } catch (err) {
      toast.error("Failed to close hackathon: " + String(err));
    }
  }, [presentationId, camperId, closeHackathon, refetch]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading showcase…</div>;

  const RANK_BADGES = ["🥇", "🥈", "🥉", "4️⃣"];

  return (
    <div className="space-y-5">
      {/* Tab toggle */}
      <div className="flex gap-2">
        <Button variant={tab === "submit" ? "default" : "outline"} size="sm" onClick={() => setTab("submit")}>
          <Icon icon="upload" className="w-4 h-4 mr-1.5" /> Submit Project
        </Button>
        <Button variant={tab === "vote" ? "default" : "outline"} size="sm" onClick={() => setTab("vote")}>
          <Icon icon="star" className="w-4 h-4 mr-1.5" /> Vote & Results
          <span className="ml-1.5 text-xs text-muted-foreground">({totalVoters}/{totalCampers})</span>
        </Button>
      </div>

      {/* Submit tab */}
      {tab === "submit" && (
        <Card className="p-5 space-y-4 border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex items-center gap-2">
            <Icon icon="rocket" className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base">Your Team's Project</h3>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">🤖 App / Agent Name</label>
              <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="What did you build?"
                value={form.app_name} onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">📝 Description</label>
              <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y" placeholder="What does it do?"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">🎯 Use Case & Need</label>
              <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y" placeholder="What problem does it solve?"
                value={form.use_case} onChange={(e) => setForm((f) => ({ ...f, use_case: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">⚙️ How It Works</label>
              <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y" placeholder="How does someone use it? When and why?"
                value={form.how_it_works} onChange={(e) => setForm((f) => ({ ...f, how_it_works: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">👥 Who Uses It</label>
              <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y" placeholder="Who benefits? What role or team?"
                value={form.who_uses_it} onChange={(e) => setForm((f) => ({ ...f, who_uses_it: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">🔗 Link to App / Agent</label>
              <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="https://..."
                value={form.app_link} onChange={(e) => setForm((f) => ({ ...f, app_link: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : mySubmission ? "Update Submission" : "Submit Project"}
          </Button>
        </Card>
      )}

      {/* Vote tab */}
      {tab === "vote" && (
        <div className="space-y-4">
          {/* Admin: Award Winner button */}
          {isAdmin && submissions.length > 0 && !hackathonClosed && (
            <Card className="p-4 border-amber-300 bg-amber-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <div>
                    <p className="text-sm font-bold text-amber-900">Ready to award the winner?</p>
                    <p className="text-[10px] text-muted-foreground">
                      Awards +10 team pts + Innovation badge to every member of the top-voted team
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCloseHackathon}
                  disabled={closing}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
                >
                  {closing ? "Awarding..." : "🏆 Award Winner"}
                </Button>
              </div>
            </Card>
          )}
          {hackathonClosed && (
            <Card className="p-4 border-green-300 bg-green-50/50">
              <div className="flex items-center gap-2">
                <Icon icon="check-circle-2" className="w-5 h-5 text-green-600" />
                <p className="text-sm font-bold text-green-900">Winner awarded! Innovation badges + team points distributed.</p>
              </div>
            </Card>
          )}
          {submissions.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Icon icon="inbox" className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No submissions yet. Build something first!</p>
            </Card>
          ) : (
            <>
              {/* Vote progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                    style={{ width: `${(totalVoters / totalCampers) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{totalVoters}/{totalCampers} votes in</span>
              </div>

              {/* Submission cards */}
              {submissions.map((s: any, i: number) => {
                const isMyTeam = s.team_id === camperTeamId;
                const isVoted = myVote === s.team_id;
                return (
                  <Card key={s.team_id} className={`overflow-hidden ${isVoted ? "ring-2 ring-amber-400" : ""}`}>
                    <div className="p-1.5" style={{ backgroundColor: s.team_color ?? "#666" }}>
                      <div className="flex items-center justify-between px-3">
                        <span className="text-white font-bold text-sm">{RANK_BADGES[i] ?? ""} {s.team_name}</span>
                        <span className="text-white/80 text-xs">{s.vote_count} vote{s.vote_count !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-lg">{s.app_name || "Untitled"}</h4>
                      {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                      {s.use_case && (
                        <div className="text-xs"><span className="font-semibold">🎯 Use Case:</span> {s.use_case}</div>
                      )}
                      {s.how_it_works && (
                        <div className="text-xs"><span className="font-semibold">⚙️ How:</span> {s.how_it_works}</div>
                      )}
                      {s.who_uses_it && (
                        <div className="text-xs"><span className="font-semibold">👥 Who:</span> {s.who_uses_it}</div>
                      )}
                      {s.app_link && (
                        <a href={s.app_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Icon icon="external-link" className="w-3 h-3" /> Try it →
                        </a>
                      )}
                      {/* Vote button */}
                      {!isMyTeam && !myVote && (
                        <Button size="sm" variant="outline" onClick={() => handleVote(s.team_id)} disabled={voting}
                          className="mt-2">
                          🗳️ Vote for this project
                        </Button>
                      )}
                      {isVoted && (
                        <span className="inline-flex items-center text-xs text-amber-600 font-semibold mt-2">
                          ✅ Your vote
                        </span>
                      )}
                      {isMyTeam && (
                        <span className="inline-flex items-center text-xs text-muted-foreground mt-2">
                          ⛺ Your team
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
