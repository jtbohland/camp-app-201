import { useState, useCallback, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import SpinWheel from "@/components/SpinWheel/index.js";
import ChallengeCard from "@/components/ChallengeCard/index.js";
import PitchTimer from "@/components/PitchTimer/index.js";
import ScoringCard, { calcCompletionScore } from "@/components/ScoringCard/index.js";
import CamperSelector from "@/components/CamperSelector/index.js";
import WheelResultsModal from "@/components/WheelResultsModal/index.js";
import WheelLeaderboard from "@/components/WheelLeaderboard/index.js";
import { generateChallenge, SCORING_CATEGORIES, COMPLETION_CATEGORY, SCORE_LABELS, type WheelProduct, type Challenge } from "@/lib/wheelData.js";

// ── Types ────────────────────────────────────────────────
type CamperPhase = "waiting" | "room_voting" | "self_eval" | "submitted";
type CounselorPhase = "idle" | "selecting" | "challenge" | "monitoring" | "results";

type PickedCamper = { id: number; first_name: string; last_name: string };

type ActiveRound = {
  id: number;
  pitcher_id: number;
  product_id: string;
  product_name: string;
  challenge_type: string;
  challenge_prompt: string;
  completion_score: number;
  pitch_time_seconds: number;
  status: string;
  pitcher_submitted: boolean;
  vote_count: number;
};

function formatPitchTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function WheelAndDealPage() {
  const user = useSuperblocksUser();

  // ── Identity ──────────────────────────────────────────
  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email, staleTime: 60_000 });

  const camperId: number = camperData?.camper?.id ?? 0;
  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";

  // ── Cohort for cAMPer selector (counselor only) ──────
  const { data: cohortData } = useApiData("GetCohort", {}, {
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const allCampers = (cohortData?.members ?? []).filter(
    (m: { role: string | null }) => m.role !== "counselor" && m.role !== "admin"
  );

  // ── Active round polling (all campers) ───────────────
  const { data: roundData, refetch: refetchRound } = useApiData(
    "GetActiveWheelRound",
    { camper_id: camperId },
    { enabled: camperId > 0, refetchInterval: 4000 }
  );
  const activeRound: ActiveRound | null = roundData?.round ?? null;
  const alreadyScored: boolean = roundData?.already_scored ?? false;

  // ── Counselor state ───────────────────────────────────
  const [counselorPhase, setCounselorPhase] = useState<CounselorPhase>("idle");
  const [selectedCamper, setSelectedCamper] = useState<PickedCamper | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [completionScore, setCompletionScore] = useState(0);
  const [pitchTime, setPitchTime] = useState(0);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [resultsData, setResultsData] = useState<{ selfTotal: number; roomAvgTotal: number; roomVoteCount: number; roomAvg: Record<string, number>; selfScores: Record<string, number>; pointsAwarded: number } | null>(null);

  // ── Camper state ──────────────────────────────────────
  const [camperPhase, setCamperPhase] = useState<CamperPhase>("waiting");

  // ── APIs ──────────────────────────────────────────────
  const { run: createRound } = useApi("CreateWheelRound");
  const { run: submitScore } = useApi("SubmitWheelScore");
  const { run: closeScoring } = useApi("CloseWheelScoring");

  // ── Detect when a round opens for non-counselors ─────
  useEffect(() => {
    if (isAdmin || camperId === 0) return;
    if (!activeRound) {
      setCamperPhase("waiting");
      return;
    }
    if (alreadyScored) {
      setCamperPhase("submitted");
      return;
    }
    if (activeRound.pitcher_id === camperId) {
      setCamperPhase("self_eval");
    } else {
      setCamperPhase("room_voting");
    }
  }, [isAdmin, camperId, activeRound, alreadyScored]);

  // ── Counselor: cAMPer selected → auto-spin ────────────
  const handleCamperSelected = useCallback((camper: PickedCamper) => {
    setSelectedCamper(camper);
    setShowSelector(false);
    setCounselorPhase("challenge");
    setAutoSpin(true);
  }, []);

  // ── Wheel lands ───────────────────────────────────────
  const handleLand = useCallback((product: WheelProduct) => {
    setAutoSpin(false);
    const ch = generateChallenge(product);
    setChallenge(ch);
  }, []);

  // ── Timer stops ───────────────────────────────────────
  const handleTimerStop = useCallback(async (elapsed: number, timeRemaining: number) => {
    const compScore = calcCompletionScore(timeRemaining);
    setCompletionScore(compScore);
    setPitchTime(elapsed);

    if (!selectedCamper || !challenge) return;
    try {
      const result = await createRound({
        pitcher_id: selectedCamper.id,
        product_id: challenge.product.id,
        product_name: challenge.product.name,
        challenge_type: challenge.typeLabel,
        challenge_prompt: challenge.prompt,
        completion_score: compScore,
        pitch_time_seconds: elapsed,
      });
      const rid = (result as any)?.round_id;
      setRoundId(rid);
      setCounselorPhase("monitoring");
      toast.success("⏱️ Timer stopped — scoring is now open for everyone!");
    } catch (err) {
      toast.error("Failed to open scoring");
    }
  }, [selectedCamper, challenge, createRound]);

  // ── Close scoring (counselor) ─────────────────────────
  const handleCloseScoring = useCallback(async () => {
    if (!roundId) return;
    try {
      const result = await closeScoring({ round_id: roundId });
      const r = result as any;

      // Extract room avg scores from active round data
      const roundAvg = {
        clarity: roundData?.round?.completion_score ?? 0, // fallback, server has real data
        tone: 0, credibility: 0, close: 0,
      };

      setResultsData({
        selfTotal: r.self_total,
        roomAvgTotal: r.room_avg_total,
        roomVoteCount: r.room_vote_count,
        roomAvg: roundAvg,
        selfScores: {},
        pointsAwarded: r.points_awarded,
      });
      setCounselorPhase("results");
      refetchRound();
    } catch (err) {
      toast.error("Failed to close scoring");
    }
  }, [roundId, closeScoring, roundData, refetchRound]);

  // ── Submit score (any camper) ─────────────────────────
  const handleSubmitScore = useCallback(async (scores: Record<string, number>, isSelf: boolean) => {
    if (!activeRound && !roundId) return;
    const rid = isSelf ? roundId : activeRound?.id;
    if (!rid || camperId === 0) return;
    const comp = isSelf ? completionScore : (activeRound?.completion_score ?? 1);
    try {
      await submitScore({
        round_id: rid,
        scorer_id: camperId,
        is_self_eval: isSelf,
        clarity: scores.clarity ?? 0,
        tone: scores.tone ?? 0,
        credibility: scores.credibility ?? 0,
        close_score: scores.close ?? 0,
        completion: comp,
      });
      if (isSelf) {
        toast.success("✅ Self-eval submitted!");
      } else {
        toast.success("✅ Your vote is in!");
      }
      setCamperPhase("submitted");
      refetchRound();
    } catch (err) {
      toast.error("Failed to submit score");
    }
  }, [activeRound, roundId, camperId, completionScore, submitScore, refetchRound]);

  const handleNextRound = useCallback(() => {
    setCounselorPhase("idle");
    setSelectedCamper(null);
    setChallenge(null);
    setCompletionScore(0);
    setPitchTime(0);
    setRoundId(null);
    setResultsData(null);
    setAutoSpin(false);
  }, []);

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6">
      {/* cAMPer Selector modal */}
      {showSelector && (
        <CamperSelector
          campers={allCampers}
          onSelected={handleCamperSelected}
          onCancel={() => setShowSelector(false)}
        />
      )}

      {/* Results modal */}
      {counselorPhase === "results" && resultsData && selectedCamper && (
        <WheelResultsModal
          pitcherName={`${selectedCamper.first_name} ${selectedCamper.last_name}`}
          selfScores={resultsData.selfScores}
          selfTotal={resultsData.selfTotal}
          roomAvg={resultsData.roomAvg}
          roomAvgTotal={resultsData.roomAvgTotal}
          roomVoteCount={resultsData.roomVoteCount}
          completionScore={completionScore}
          pointsAwarded={resultsData.pointsAwarded}
          onClose={handleNextRound}
        />
      )}

      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🎡</span> Wheel &amp; Deal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spin the wheel, pitch out loud, get scored — practice makes permanent.
        </p>
        <button
          onClick={() => setShowHowTo(!showHowTo)}
          className="text-xs text-primary hover:underline mt-1.5 flex items-center gap-1"
        >
          <Icon icon={showHowTo ? "chevron-up" : "chevron-down"} className="w-3 h-3" />
          {showHowTo ? "Hide" : "How to Play & How to Score"}
        </button>
      </div>

      {/* How to Play / How to Score */}
      {showHowTo && (
        <Card className="p-5 mb-5 bg-blue-50/50 border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800 mb-3">🎯 How to Play</h3>
              <ol className="space-y-2 text-sm text-foreground">
                <li className="flex gap-2"><span className="font-bold text-blue-600">1.</span><span><strong>🎡 Pick &amp; Spin</strong> — Counselor picks a cAMPer, the wheel spins to a product.</span></li>
                <li className="flex gap-2"><span className="font-bold text-blue-600">2.</span><span><strong>🎤 Pitch</strong> — 2-minute verbal pitch, no slides, no script. Timer is facilitator-controlled.</span></li>
                <li className="flex gap-2"><span className="font-bold text-blue-600">3.</span><span><strong>⭐ Everyone Scores</strong> — The pitcher rates themselves. Everyone else in the room submits their own score too.</span></li>
                <li className="flex gap-2"><span className="font-bold text-blue-600">4.</span><span><strong>🔒 Close</strong> — Counselor closes scoring. Results reveal the pitcher's self-eval vs. the room average.</span></li>
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800 mb-3">🏆 How You're Scored</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {[...SCORING_CATEGORIES, COMPLETION_CATEGORY].map((c) => (
                  <div key={c.key} className="flex flex-col items-center text-center px-3 py-2 rounded-lg border border-blue-200 bg-white flex-1 min-w-[70px]">
                    <span className="text-lg mb-0.5">{c.icon}</span>
                    <span className="text-[11px] font-bold text-foreground">{c.label}</span>
                    <span className="text-[9px] text-muted-foreground">{c.subtext}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">1–3 scale</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">1 Needs Work</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">2 Getting There</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">3 Nailed It</span>
                </div>
                <div><span className="font-semibold text-orange-600">/15 total</span> — 5 categories × 3 max = 15 possible</div>
                <div><span className="font-semibold text-blue-600">AUTO</span> — Completion: 3 = 30+ sec left · 2 = under 30 sec · 1 = time up</div>
                <div className="mt-2 font-medium text-foreground">🏆 Points: +5 for pitching · up to +3 self-awareness · +2 if room avg ≥ 12</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── MAIN LAYOUT: Wheel left, controls right ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">

        {/* LEFT: Wheel (always visible for counselors; campers see it too while waiting) */}
        <div className="flex flex-col items-center gap-4">
          {/* cAMPer Selector button — counselor only */}
          {isAdmin && counselorPhase === "idle" && (
            <Button
              onClick={() => setShowSelector(true)}
              size="lg"
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-6 text-lg rounded-2xl shadow-lg"
            >
              🎲 Pick a cAMPer
            </Button>
          )}

          {/* Selected pitcher pill */}
          {isAdmin && selectedCamper && counselorPhase !== "idle" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 border border-purple-300">
              <span className="text-lg">🎤</span>
              <span className="font-bold text-purple-900">{selectedCamper.first_name} {selectedCamper.last_name}</span>
              <Badge variant="outline" className="text-purple-700 border-purple-300 text-xs">Pitcher</Badge>
            </div>
          )}

          <SpinWheel
            onLand={handleLand}
            autoSpin={autoSpin}
            disabled={isAdmin ? (counselorPhase !== "challenge" || !!challenge) : true}
            disabledLabel={isAdmin ? (counselorPhase === "monitoring" ? "⏳ Scoring in progress" : undefined) : "🎤 Watch the pitcher!"}
          />
        </div>

        {/* RIGHT: Phase-driven content */}
        <div className="flex flex-col gap-4 min-h-[400px]">

          {/* ─── COUNSELOR: idle ────────────────────────── */}
          {isAdmin && counselorPhase === "idle" && (
            <Card className="p-8 flex flex-col items-center justify-center text-center h-full gap-4 border-dashed">
              <div className="text-5xl">🎡</div>
              <h2 className="text-xl font-bold">Ready to Start</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Click "Pick a cAMPer" to randomly select who pitches next, then spin the wheel to get their product and challenge.
              </p>
            </Card>
          )}

          {/* ─── COUNSELOR: challenge + timer ────────────── */}
          {isAdmin && counselorPhase === "challenge" && challenge && (
            <div className="space-y-4">
              <ChallengeCard challenge={challenge} />
              <PitchTimer onStop={handleTimerStop} />
            </div>
          )}

          {/* ─── COUNSELOR: monitoring votes ─────────────── */}
          {isAdmin && counselorPhase === "monitoring" && activeRound && (
            <div className="space-y-4">
              <ChallengeCard challenge={challenge!} />

              {/* Pitch summary */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground px-1">
                <Icon icon="clock" className="w-4 h-4" />
                Pitch time: <strong className="text-foreground">{formatPitchTime(pitchTime)}</strong>
                <span className="mx-1">·</span>
                <span>Completion: <strong>{completionScore}/3</strong></span>
              </div>

              {/* Scoring status */}
              <Card className={`p-5 border-2 ${activeRound.pitcher_submitted ? "border-green-400 bg-green-50/50" : "border-amber-300 bg-amber-50/30"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon icon={activeRound.pitcher_submitted ? "check-circle" : "clock"} className={`w-5 h-5 ${activeRound.pitcher_submitted ? "text-green-600" : "text-amber-600"}`} />
                    <span className="text-sm font-bold">
                      {activeRound.pitcher_submitted ? "Pitcher has submitted ✅" : "Waiting for pitcher..."}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    {activeRound.vote_count} room vote{activeRound.vote_count !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {activeRound.pitcher_submitted ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {activeRound.vote_count > 0
                        ? `${activeRound.vote_count} cAMPer${activeRound.vote_count !== 1 ? "s" : ""} have voted. Only fully-submitted scores count.`
                        : "No room votes yet. You can close scoring at any time."}
                    </p>
                    <Button
                      onClick={handleCloseScoring}
                      className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold py-4 text-base rounded-xl"
                    >
                      🔒 Close Scoring
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Scoring is open. {activeRound.vote_count} room vote{activeRound.vote_count !== 1 ? "s" : ""} in so far. Wait for the pitcher to submit their self-eval before closing.
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* ─── CAMPER: waiting for a round ─────────────── */}
          {!isAdmin && camperPhase === "waiting" && (
            <Card className="p-8 flex flex-col items-center justify-center text-center h-full gap-4 border-dashed">
              <div className="text-5xl">👀</div>
              <h2 className="text-xl font-bold">Watching...</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                The counselor will select a pitcher and spin the wheel. When someone pitches and the timer stops, your scoring card will appear here.
              </p>
            </Card>
          )}

          {/* ─── CAMPER: room vote form ───────────────────── */}
          {!isAdmin && camperPhase === "room_voting" && activeRound && (
            <div className="space-y-4">
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🗳️</span>
                  <span className="font-bold text-purple-900">Rate the pitch!</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>{activeRound.product_name}</strong> — {activeRound.challenge_type}
                </p>
              </Card>
              <ScoringCard
                mode="coach"
                onSubmit={(scores) => handleSubmitScore(scores, false)}
                completionScore={activeRound.completion_score}
              />
            </div>
          )}

          {/* ─── CAMPER: self-eval (pitcher) ─────────────── */}
          {!isAdmin && camperPhase === "self_eval" && activeRound && (
            <div className="space-y-4">
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🎤</span>
                  <span className="font-bold text-blue-900">You just pitched! Rate yourself.</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>{activeRound.product_name}</strong> — {activeRound.challenge_type} · Pitch time: {formatPitchTime(activeRound.pitch_time_seconds)}
                </p>
              </Card>
              <ScoringCard
                mode="self"
                onSubmit={(scores) => handleSubmitScore(scores, true)}
                completionScore={activeRound.completion_score}
              />
            </div>
          )}

          {/* ─── CAMPER: submitted, waiting ──────────────── */}
          {!isAdmin && camperPhase === "submitted" && (
            <Card className="p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                <Icon icon="check-circle-2" className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Score submitted!</h2>
              <p className="text-sm text-muted-foreground">
                Waiting for the counselor to close scoring and reveal results...
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ── LEADERBOARD ──────────────────────────────── */}
      <div className="mt-6">
        <WheelLeaderboard />
      </div>
    </div>
  );
}
