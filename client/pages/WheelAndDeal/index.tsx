import { useState, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import SpinWheel from "@/components/SpinWheel/index.js";
import ChallengeCard from "@/components/ChallengeCard/index.js";
import PitchTimer from "@/components/PitchTimer/index.js";
import ScoringCard, { calcCompletionScore } from "@/components/ScoringCard/index.js";
import CamperSelector from "@/components/CamperSelector/index.js";
import WheelResultsModal from "@/components/WheelResultsModal/index.js";
import WheelLeaderboard from "@/components/WheelLeaderboard/index.js";
import WheelScoringMonitor from "@/components/WheelScoringMonitor/index.js";
import WheelVoteProgress from "@/components/WheelVoteProgress/index.js";
import { queryClient } from "@superblocksteam/library";
import { errorMessage } from "@/lib/cohortRefresh.js";
import { generateChallenge, SCORING_CATEGORIES, COMPLETION_CATEGORY, type WheelProduct, type Challenge } from "@/lib/wheelData.js";

// ── Types ────────────────────────────────────────────────
type CamperPhase = "waiting" | "room_voting" | "self_eval" | "submitted";
type CounselorPhase = "idle" | "challenge" | "results";

type PickedCamper = { id: number; first_name: string; last_name: string };

type ActiveRound = {
  id: number;
  pitcher_id: number;
  pitcher_name: string;
  product_id: string;
  product_name: string;
  challenge_type: string;
  challenge_prompt: string;
  completion_score: number;
  pitch_time_seconds: number;
  status: string;
  pitcher_submitted: boolean;
  vote_count: number;
  expected_count: number;
};

type Results = {
  pitcherName: string;
  selfTotal: number;
  selfScores: Record<string, number>;
  roomAvg: Record<string, number>;
  roomAvgTotal: number;
  roomVoteCount: number;
  completionScore: number;
  pointsAwarded: number;
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
  const { isAdmin } = useIsAdmin();

  // ── Cohort for cAMPer selector (counselor only) ──────
  const { data: cohortData } = useApiData("GetCohort", {}, {
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const allCampers = (cohortData?.members ?? []).filter(
    (m: { role: string | null }) => m.role !== "counselor" && m.role !== "admin"
  );

  // ── Open round polling (everyone) ──────────────────
  // The server works out who is signed in, so the pitcher always gets the self-eval
  // on their own device and everyone else gets the room vote.
  const { data: roundData, refetch: refetchRound } = useApiData(
    "GetActiveWheelRound",
    {},
    { enabled: camperId > 0 || isAdmin, refetchInterval: 4000 }
  );
  const activeRound: ActiveRound | null = roundData?.round ?? null;
  const alreadyScored: boolean = roundData?.already_scored ?? false;
  const isPitcher: boolean = roundData?.is_pitcher ?? false;
  const waitingOn: string[] = roundData?.waiting_on ?? [];

  // ── Counselor state ───────────────────────────────────
  const [counselorPhase, setCounselorPhase] = useState<CounselorPhase>("idle");
  const [selectedCamper, setSelectedCamper] = useState<PickedCamper | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [resultsData, setResultsData] = useState<Results | null>(null);

  // Counselor watches the open round from the server, so a refresh never loses it.
  const monitoring = isAdmin && !!activeRound && counselorPhase !== "results";

  // ── Camper state (derived from the server) ────────────
  const camperPhase: CamperPhase = !activeRound
    ? "waiting"
    : alreadyScored
      ? "submitted"
      : isPitcher
        ? "self_eval"
        : "room_voting";

  // ── APIs ──────────────────────────────────────────────
  const { run: createRound } = useApi("CreateWheelRound");
  const { run: submitScore } = useApi("SubmitWheelScore");
  const { run: closeScoring } = useApi("CloseWheelScoring");

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

  // ── Timer stops → open scoring ────────────────────────
  const handleTimerStop = useCallback(async (elapsed: number, timeRemaining: number) => {
    if (!selectedCamper || !challenge || opening) return;
    setOpening(true);
    try {
      await createRound({
        pitcher_id: selectedCamper.id,
        product_id: challenge.product.id,
        product_name: challenge.product.name,
        challenge_type: challenge.typeLabel,
        challenge_prompt: challenge.prompt,
        completion_score: calcCompletionScore(timeRemaining),
        pitch_time_seconds: elapsed,
      });
      setCounselorPhase("idle");
      setChallenge(null);
      await refetchRound();
      toast.success("⏱️ Timer stopped — scoring is now open for everyone!");
    } catch (err) {
      toast.error("Couldn't open scoring: " + errorMessage(err));
    } finally {
      setOpening(false);
    }
  }, [selectedCamper, challenge, opening, createRound, refetchRound]);

  // ── Close scoring (counselor) ─────────────────────────
  const handleCloseScoring = useCallback(async () => {
    if (!activeRound || closing) return;
    setClosing(true);
    try {
      const r = await closeScoring({ round_id: activeRound.id });
      if (!r) throw new Error("No response from the server");
      setResultsData({
        pitcherName: activeRound.pitcher_name,
        selfTotal: r.self_total,
        selfScores: r.self_scores,
        roomAvg: r.room_avg,
        roomAvgTotal: r.room_avg_total,
        roomVoteCount: r.room_vote_count,
        completionScore: r.completion_score,
        pointsAwarded: r.points_awarded,
      });
      setCounselorPhase("results");
      await Promise.all([refetchRound(), queryClient.invalidateQueries("GetWheelLeaderboard")]);
    } catch (err) {
      toast.error("Couldn't close scoring: " + errorMessage(err));
    } finally {
      setClosing(false);
    }
  }, [activeRound, closing, closeScoring, refetchRound]);

  // ── Submit score (pitcher or room) ────────────────────
  // Throws on failure so the scoring card keeps the answers for a retry.
  const handleSubmitScore = useCallback(async (scores: Record<string, number>) => {
    if (!activeRound) {
      toast.error("Scoring for this pitch has closed.");
      return;
    }
    try {
      const res = await submitScore({
        round_id: activeRound.id,
        clarity: scores.clarity ?? 0,
        tone: scores.tone ?? 0,
        credibility: scores.credibility ?? 0,
        close_score: scores.close ?? 0,
      });
      toast.success(res?.is_self_eval ? "✅ Self-eval submitted!" : "✅ Your vote is in!");
      await refetchRound();
    } catch (err) {
      toast.error("Couldn't submit your score: " + errorMessage(err));
      throw err;
    }
  }, [activeRound, submitScore, refetchRound]);

  const handleNextRound = useCallback(() => {
    setCounselorPhase("idle");
    setSelectedCamper(null);
    setChallenge(null);
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
      {counselorPhase === "results" && resultsData && (
        <WheelResultsModal
          pitcherName={resultsData.pitcherName}
          selfScores={resultsData.selfScores}
          selfTotal={resultsData.selfTotal}
          roomAvg={resultsData.roomAvg}
          roomAvgTotal={resultsData.roomAvgTotal}
          roomVoteCount={resultsData.roomVoteCount}
          completionScore={resultsData.completionScore}
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
          {isAdmin && counselorPhase === "idle" && !monitoring && (
            <Button
              onClick={() => setShowSelector(true)}
              size="lg"
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-6 text-lg rounded-2xl shadow-lg"
            >
              🎲 Pick a cAMPer
            </Button>
          )}

          {/* Selected pitcher pill */}
          {isAdmin && selectedCamper && counselorPhase === "challenge" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 border border-purple-300">
              <span className="text-lg">🎤</span>
              <span className="font-bold text-purple-900">{selectedCamper.first_name} {selectedCamper.last_name}</span>
              <Badge variant="outline" className="text-purple-700 border-purple-300 text-xs">Pitcher</Badge>
            </div>
          )}

          <SpinWheel
            onLand={handleLand}
            autoSpin={autoSpin}
            disabled={isAdmin ? (monitoring || counselorPhase !== "challenge" || !!challenge) : true}
            disabledLabel={isAdmin ? (monitoring ? "⏳ Scoring in progress" : undefined) : "🎤 Watch the pitcher!"}
          />
        </div>

        {/* RIGHT: Phase-driven content */}
        <div className="flex flex-col gap-4 min-h-[400px]">

          {/* ─── COUNSELOR: idle ────────────────────────── */}
          {isAdmin && counselorPhase === "idle" && !monitoring && (
            <Card className="p-8 flex flex-col items-center justify-center text-center h-full gap-4 border-dashed">
              <div className="text-5xl">🎡</div>
              <h2 className="text-xl font-bold">Ready to Start</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Click "Pick a cAMPer" to randomly select who pitches next, then spin the wheel to get their product and challenge.
              </p>
            </Card>
          )}

          {/* ─── COUNSELOR: challenge + timer ────────────── */}
          {isAdmin && counselorPhase === "challenge" && challenge && !monitoring && (
            <div className="space-y-4">
              <ChallengeCard challenge={challenge} />
              <PitchTimer onStop={handleTimerStop} />
              {opening && <p className="text-xs text-muted-foreground text-center">Opening scoring...</p>}
            </div>
          )}

          {/* ─── COUNSELOR: monitoring votes ─────────────── */}
          {monitoring && activeRound && (
            <WheelScoringMonitor
              key={activeRound.id}
              round={activeRound}
              waitingOn={waitingOn}
              closing={closing}
              onClose={handleCloseScoring}
            />
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
                  <strong>{activeRound.pitcher_name}</strong> · {activeRound.product_name} — {activeRound.challenge_type}
                </p>
              </Card>
              <ScoringCard
                key={activeRound.id}
                mode="coach"
                onSubmit={handleSubmitScore}
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
                key={activeRound.id}
                mode="self"
                onSubmit={handleSubmitScore}
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
              {activeRound && (
                <div className="w-full max-w-xs">
                  <WheelVoteProgress compact submitted={activeRound.vote_count} expected={activeRound.expected_count} />
                </div>
              )}
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
