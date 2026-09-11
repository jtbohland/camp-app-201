import { Button } from "@/components/ui/button";
import { SCORING_CATEGORIES } from "@/lib/wheelData.js";

type Props = {
  pitcherName: string;
  selfScores: Record<string, number>;
  selfTotal: number;
  roomAvg: Record<string, number>;
  roomAvgTotal: number;
  roomVoteCount: number;
  completionScore: number;
  pointsAwarded: number;
  onClose: () => void;
};

function ScoreBar({ value, max = 3, color }: { value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function WheelResultsModal({
  pitcherName, selfScores, selfTotal, roomAvg, roomAvgTotal,
  roomVoteCount, completionScore, pointsAwarded, onClose,
}: Props) {
  const allCategories = [
    ...SCORING_CATEGORIES.map((c) => ({ key: c.key, icon: c.icon, label: c.label })),
    { key: "completion", icon: "⚡", label: "Completion" },
  ];

  const diff = Math.abs(selfTotal - roomAvgTotal);
  const awarenessLabel = diff <= 1 ? "🎯 Spot on!" : diff <= 2 ? "👍 Close" : "🤔 Big gap";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📊</div>
          <h2 className="text-2xl font-black">{pitcherName}'s Results</h2>
          <p className="text-sm text-muted-foreground mt-1">{roomVoteCount} room vote{roomVoteCount !== 1 ? "s" : ""} submitted</p>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-3 items-center mb-6">
          <div />
          <div className="text-center">
            <div className="text-xs font-bold uppercase text-blue-600 mb-1">Self</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase text-purple-600 mb-1">Room Avg</div>
          </div>

          {allCategories.map((cat) => {
            const selfVal = cat.key === "completion" ? completionScore : (selfScores[cat.key] ?? 0);
            const roomVal = cat.key === "completion" ? completionScore : (roomAvg[cat.key] ?? 0);
            const isCompletion = cat.key === "completion";

            return (
              <div key={cat.key} className="contents">
                <div className="flex items-center gap-2 text-sm">
                  <span>{cat.icon}</span>
                  <span className="font-medium">{cat.label}</span>
                  {isCompletion && <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">AUTO</span>}
                </div>
                <div className="text-center w-16">
                  <div className="text-lg font-bold text-blue-700">{selfVal}</div>
                  <ScoreBar value={selfVal} color="bg-blue-500" />
                </div>
                <div className="text-center w-16">
                  <div className="text-lg font-bold text-purple-700">{typeof roomVal === "number" ? Math.round(roomVal * 10) / 10 : roomVal}</div>
                  <ScoreBar value={typeof roomVal === "number" ? roomVal : 0} color="bg-purple-500" />
                </div>
              </div>
            );
          })}

          {/* Totals row */}
          <div className="flex items-center gap-2 text-sm font-bold border-t pt-3 mt-1">
            <span>🏆</span> Total
          </div>
          <div className="text-center border-t pt-3 mt-1">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-800 font-black text-xl">
              {selfTotal}
            </span>
            <div className="text-[10px] text-muted-foreground mt-0.5">/15</div>
          </div>
          <div className="text-center border-t pt-3 mt-1">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-800 font-black text-xl">
              {Math.round(roomAvgTotal * 10) / 10}
            </span>
            <div className="text-[10px] text-muted-foreground mt-0.5">/15</div>
          </div>
        </div>

        {/* Self-awareness badge */}
        <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 mb-4">
          <span className="text-2xl">{awarenessLabel.split(" ")[0]}</span>
          <div>
            <div className="text-sm font-bold">{awarenessLabel.split(" ").slice(1).join(" ")}</div>
            <div className="text-xs text-muted-foreground">
              Self vs Room difference: {Math.round(diff * 10) / 10} point{diff !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Points awarded */}
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-6">
          <span className="text-xl">🏆</span>
          <span className="text-lg font-bold text-amber-800">+{pointsAwarded} points earned!</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button onClick={onClose} size="lg" className="bg-[#2962FF] hover:bg-[#1e50d4] text-white font-bold px-10 py-6 text-lg rounded-xl">
            🎡 Next Round
          </Button>
          <div className="text-[10px] text-muted-foreground">
            +5 courage · +{Math.min(3, pointsAwarded - 5 - (roomAvgTotal >= 12 ? 2 : 0) > 0 ? pointsAwarded - 5 - (roomAvgTotal >= 12 ? 2 : 0) : 0)} self-awareness
            {roomAvgTotal >= 12 ? " · +2 room loved it" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
