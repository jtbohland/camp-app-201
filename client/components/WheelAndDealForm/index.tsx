import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

const PRODUCTS = [
  "Analytics", "CDP", "Experiment", "Session Replay", "Web Analytics",
  "Feature Flags", "Audiences", "Data Management",
];

const CHALLENGE_TYPES = [
  "Tell Me About It", "Handle the Objection", "Scenario", "Challenger Play",
];

type Props = {
  camperId: number;
  onComplete: () => void;
};

export default function WheelAndDealForm({ camperId, onComplete }: Props) {
  const [product, setProduct] = useState("");
  const [challengeType, setChallengeType] = useState("");
  const [score, setScore] = useState("");
  const [aiScore, setAiScore] = useState("");

  const { run: submit, loading } = useApi("SubmitPreworkValidation");

  const handleSubmit = useCallback(async () => {
    if (!product.trim() || !challengeType || !score.trim() || !aiScore.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const scoreNum = Number(score);
    const aiNum = Number(aiScore);
    if (isNaN(scoreNum) || isNaN(aiNum)) {
      toast.error("Scores must be numbers");
      return;
    }

    try {
      const result = await submit({
        camper_id: camperId,
        item_key: "wheel_and_deal",
        submission_data: {
          product: product.trim(),
          challenge_type: challengeType,
          score: scoreNum,
          ai_coach_score: aiNum,
        },
      });
      if (result?.success) {
        if (result.flagged) {
          toast.warning("Submitted — a counselor will review your scores.");
        } else {
          toast.success(`Wheel & Deal submitted! +${result.points_awarded} pts`);
        }
        onComplete();
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [product, challengeType, score, aiScore, camperId, submit, onComplete]);

  return (
    <div className="mt-3 space-y-3 p-4 rounded-lg border border-amber-200 bg-amber-50/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon icon="refresh-cw" className="w-5 h-5 text-amber-600" />
        <h4 className="font-semibold text-sm">Log Your Wheel & Deal Results</h4>
      </div>

      <a
        href="https://app.amplitude.com/wheel-and-deal"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 border border-amber-200 text-amber-700 hover:bg-amber-200 transition-colors"
      >
        <Icon icon="external-link" className="w-3 h-3" />
        Open Wheel & Deal
      </a>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Product</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select product...</option>
            {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Challenge Type</label>
          <select
            value={challengeType}
            onChange={(e) => setChallengeType(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select challenge...</option>
            {CHALLENGE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Score</label>
          <Input
            type="number"
            placeholder="Type in your score"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">AI Coach Score</label>
          <Input
            type="number"
            placeholder="Type in your AI Coach score"
            value={aiScore}
            onChange={(e) => setAiScore(e.target.value)}
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !product || !challengeType || !score || !aiScore}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        size="sm"
      >
        {loading ? "Submitting..." : "Mark Complete"}
      </Button>
    </div>
  );
}
