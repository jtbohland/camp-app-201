import { useState, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SpinWheel from "@/components/SpinWheel/index.js";
import ChallengeCard from "@/components/ChallengeCard/index.js";
import PitchTimer from "@/components/PitchTimer/index.js";
import ScoringCard, { calcCompletionScore } from "@/components/ScoringCard/index.js";
import { generateChallenge, SCORING_CATEGORIES, COMPLETION_CATEGORY, SCORE_LABELS, type WheelProduct, type Challenge } from "@/lib/wheelData.js";

type Phase = "spin" | "challenge" | "timer" | "selfEval" | "coachEval" | "results";

type RoundResult = {
  challenge: Challenge;
  pitchTime: number;
  selfScores: Record<string, number>;
  coachScores: Record<string, number>;
};

function formatPitchTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WheelAndDealPage() {
  const [phase, setPhase] = useState<Phase>("spin");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [pitchTime, setPitchTime] = useState(0);
  const [completionScore, setCompletionScore] = useState(0);
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});
  const [coachScores, setCoachScores] = useState<Record<string, number>>({});
  const [showHowTo, setShowHowTo] = useState(false);

  const handleLand = useCallback((product: WheelProduct) => {
    const ch = generateChallenge(product);
    setChallenge(ch);
    setPhase("challenge");
  }, []);

  const handleTimerStop = useCallback((elapsed: number, timeRemaining: number) => {
    setPitchTime(elapsed);
    setCompletionScore(calcCompletionScore(timeRemaining));
    setPhase("selfEval");
  }, []);

  const handleSelfSubmit = useCallback((scores: Record<string, number>) => {
    setSelfScores(scores);
    setPhase("coachEval");
  }, []);

  const handleCoachSubmit = useCallback((scores: Record<string, number>) => {
    setCoachScores(scores);
    setPhase("results");
  }, []);

  const handleNextRound = useCallback(() => {
    setPhase("spin");
    setChallenge(null);
    setPitchTime(0);
    setCompletionScore(0);
    setSelfScores({});
    setCoachScores({});
  }, []);

  const selfTotal = Object.values(selfScores).reduce((s, v) => s + v, 0) + completionScore;
  const coachTotal = Object.values(coachScores).reduce((s, v) => s + v, 0) + completionScore;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl">🎡</span>
          Wheel & Deal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spin the wheel, pitch out loud, get scored — practice makes permanent.
        </p>
        <button
          onClick={() => setShowHowTo(!showHowTo)}
          className="text-xs text-primary hover:underline mt-2 flex items-center gap-1"
        >
          <Icon icon={showHowTo ? "chevron-up" : "chevron-down"} className="w-3 h-3" />
          {showHowTo ? "Hide" : "How to Play & How to Score"}
        </button>
      </div>

      {/* How to Play collapse */}
      {showHowTo && (
        <Card className="p-5 mb-6 bg-blue-50/50 border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800 mb-3">🎯 How to Play</h3>
              <ol className="space-y-2 text-sm text-foreground">
                <li className="flex gap-2"><span className="font-bold text-blue-600">1.</span> <span><strong>🎡 Spin</strong> — Spin the wheel, land on a product, and read your challenge prompt.</span></li>
                <li className="flex gap-2"><span className="font-bold text-blue-600">2.</span> <span><strong>🎤 Pitch</strong> — Facilitator starts the 2-minute timer. Pitch out loud — no slides, no script.</span></li>
                <li className="flex gap-2"><span className="font-bold text-blue-600">3.</span> <span><strong>⭐ Score</strong> — Rate yourself on 4 categories (1–3 each), then the coach scores you on the same rubric.</span></li>
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800 mb-3">🏆 How You're Scored</h3>
              {/* Category cards */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[...SCORING_CATEGORIES, COMPLETION_CATEGORY].map((c) => (
                  <div key={c.key} className="flex flex-col items-center text-center px-3 py-2 rounded-lg border border-blue-200 bg-white flex-1 min-w-[80px]">
                    <span className="text-lg mb-0.5">{c.icon}</span>
                    <span className="text-xs font-bold text-foreground">{c.label}</span>
                    <span className="text-[10px] text-muted-foreground">{c.subtext}</span>
                  </div>
                ))}
              </div>
              {/* Scale + totals */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">1–3 scale</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">1 Needs Work</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">2 Getting There</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">3 Nailed It</span>
                </div>
                <div><span className="font-semibold text-orange-600">/15 total</span> — 5 categories x 3 points max = 15 possible</div>
                <div><span className="font-semibold text-blue-600">AUTO</span> — Completion is auto-scored: 3 = 30+ sec left, 2 = under 30 sec, 1 = timer ran out</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── PHASE: SPIN ── */}
      {phase === "spin" && (
        <SpinWheel onLand={handleLand} />
      )}

      {/* ── PHASE: CHALLENGE ── */}
      {phase === "challenge" && challenge && (
        <div className="space-y-4">
          <ChallengeCard challenge={challenge} />
          <PitchTimer onStop={handleTimerStop} />
        </div>
      )}

      {/* ── PHASE: SELF-EVAL ── */}
      {phase === "selfEval" && challenge && (
        <div className="space-y-4">
          <ChallengeCard challenge={challenge} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon="clock" className="w-4 h-4" />
            Pitch time: <span className="font-bold text-foreground">{formatPitchTime(pitchTime)}</span>
          </div>
          <ScoringCard mode="self" onSubmit={handleSelfSubmit} completionScore={completionScore} />
        </div>
      )}

      {/* ── PHASE: COACH EVAL ── */}
      {phase === "coachEval" && challenge && (
        <div className="space-y-4">
          <ChallengeCard challenge={challenge} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon="clock" className="w-4 h-4" />
            Pitch time: <span className="font-bold text-foreground">{formatPitchTime(pitchTime)}</span>
            <span className="mx-2">·</span>
            <span>Self-Eval: <strong>{selfTotal}/15</strong></span>
          </div>
          <ScoringCard mode="coach" onSubmit={handleCoachSubmit} completionScore={completionScore} />
        </div>
      )}

      {/* ── PHASE: RESULTS ── */}
      {phase === "results" && challenge && (
        <div className="space-y-4">
          {/* Challenge recap */}
          <Card className="p-4" style={{ borderColor: challenge.product.color + "30" }}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xl">{challenge.product.icon}</span>
              <span className="font-semibold">{challenge.product.name}</span>
              <Badge variant="outline" className="ml-auto text-xs">{challenge.typeLabel}</Badge>
            </div>
          </Card>

          {/* Pitch time */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Icon icon="clock" className="w-4 h-4" />
            Pitch time: <span className="font-bold text-foreground text-lg">{formatPitchTime(pitchTime)}</span>
          </div>

          {/* Side-by-side scores */}
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4 text-center">
              Score Comparison
            </h3>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 items-center">
              <div />
              <div className="text-xs font-bold text-center text-muted-foreground uppercase">Self</div>
              <div className="text-xs font-bold text-center text-muted-foreground uppercase">Coach</div>

              {SCORING_CATEGORIES.map((cat) => {
                const selfVal = selfScores[cat.key] ?? 0;
                const coachVal = coachScores[cat.key] ?? 0;
                return (
                  <div key={cat.key} className="contents">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{cat.icon}</span>
                      <span className="font-medium">{cat.label}</span>
                    </div>
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                        {selfVal}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-700 font-bold text-sm">
                        {coachVal}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Completion row — auto-filled for both */}
              <div className="contents">
                <div className="flex items-center gap-2 text-sm">
                  <span>⚡</span>
                  <span className="font-medium">Completion</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">AUTO</span>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                    {completionScore}
                  </span>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-700 font-bold text-sm">
                    {completionScore}
                  </span>
                </div>
              </div>

              {/* Totals */}
              <div className="flex items-center gap-2 text-sm font-bold border-t pt-3 mt-1">
                <span>🏆</span> Total
              </div>
              <div className="text-center border-t pt-3 mt-1">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold text-lg">
                  {selfTotal}
                </span>
                <div className="text-[10px] text-muted-foreground mt-0.5">/15</div>
              </div>
              <div className="text-center border-t pt-3 mt-1">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-800 font-bold text-lg">
                  {coachTotal}
                </span>
                <div className="text-[10px] text-muted-foreground mt-0.5">/15</div>
              </div>
            </div>
          </Card>

          {/* Next round */}
          <button
            onClick={handleNextRound}
            className="w-full py-4 rounded-xl text-lg font-bold text-white bg-[#2962FF] hover:bg-[#1e50d4] transition-colors shadow-lg"
          >
            🎡 Spin Again
          </button>
        </div>
      )}
    </div>
  );
}
