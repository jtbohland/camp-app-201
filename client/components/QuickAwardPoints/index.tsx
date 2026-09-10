import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

const POINT_PRESETS = [1, 2, 3, 5, 10];
const REASON_PRESETS = [
  "Great question!",
  "Excellent participation",
  "Team spirit",
  "Insightful answer",
  "Leadership moment",
  "Helped a teammate",
];

type Props = {
  camperId: number;
};

export default function QuickAwardPoints({ camperId }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCamper, setSelectedCamper] = useState<any>(null);
  const [points, setPoints] = useState(3);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("bonus");

  const { data } = useApiData("GetRegisteredCampers", {});
  const { run: award, loading } = useApi("QuickAwardPoints");

  const campers = useMemo(() => {
    const all = (data?.campers ?? []) as any[];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((c: any) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const handleAward = useCallback(async () => {
    if (!selectedCamper || !reason.trim()) {
      toast.error("Select a camper and add a reason");
      return;
    }
    try {
      await award({
        camper_id: selectedCamper.id,
        points,
        reason,
        awarded_by: camperId,
        category,
      });
      toast.success(`⚡ ${points} pts awarded to ${selectedCamper.first_name}!`);
      setSelectedCamper(null);
      setPoints(3);
      setReason("");
      setSearch("");
      setOpen(false);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [selectedCamper, points, reason, category, camperId, award]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-2xl"
        title="Award Points"
      >
        ⚡
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-h-[80vh] overflow-auto">
          <Card className="shadow-2xl border-2 border-amber-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="font-bold text-sm">Quick Award Points</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Icon icon="x" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Step 1: Select camper */}
              {!selectedCamper ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Select Camper</label>
                  <Input
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="max-h-48 overflow-auto space-y-1">
                    {campers.slice(0, 20).map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCamper(c)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left text-sm transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#1b3a2d] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <div>
                          <div className="font-medium">{c.first_name} {c.last_name}</div>
                          <div className="text-xs text-muted-foreground">{c.team_name || "No team"}</div>
                        </div>
                      </button>
                    ))}
                    {campers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">No campers found</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected camper */}
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#1b3a2d] text-white flex items-center justify-center text-xs font-bold">
                        {selectedCamper.first_name?.[0]}{selectedCamper.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{selectedCamper.first_name} {selectedCamper.last_name}</div>
                        <div className="text-xs text-muted-foreground">{selectedCamper.team_name || "No team"}</div>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedCamper(null); setSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground">
                      Change
                    </button>
                  </div>

                  {/* Points */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Points</label>
                    <div className="flex gap-1.5">
                      {POINT_PRESETS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPoints(p)}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                            points === p
                              ? "bg-amber-500 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          +{p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason quick picks */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reason</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {REASON_PRESETS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r)}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                            reason === r ? "bg-amber-100 border-amber-300 text-amber-800" : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Or type a custom reason..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                    <div className="flex gap-1.5">
                      {[
                        { value: "bonus", label: "⭐ Bonus" },
                        { value: "participation", label: "🙋 Participation" },
                        { value: "teamwork", label: "🤝 Teamwork" },
                      ].map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setCategory(cat.value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            category === cat.value
                              ? "bg-[#1b3a2d] text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleAward}
                    disabled={loading || !reason.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  >
                    {loading ? "Awarding..." : `⚡ Award ${points} pts to ${selectedCamper.first_name}`}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
