import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import WheelVoteProgress from "@/components/WheelVoteProgress/index.js";

export type MonitorRound = {
  id: number;
  pitcher_name: string;
  product_name: string;
  challenge_type: string;
  challenge_prompt: string;
  completion_score: number;
  pitch_time_seconds: number;
  pitcher_submitted: boolean;
  vote_count: number;
  expected_count: number;
};

type Props = {
  round: MonitorRound;
  waitingOn: string[];
  closing: boolean;
  onClose: () => void;
};

function formatPitchTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Counselor view while a pitch is being scored: who's in, who's not, and Close Scoring. */
export default function WheelScoringMonitor({ round, waitingOn, closing, onClose }: Props) {
  const [showWaiting, setShowWaiting] = useState(false);
  const [confirmNoSelf, setConfirmNoSelf] = useState(false);

  const handleClose = () => {
    if (!round.pitcher_submitted && !confirmNoSelf) {
      setConfirmNoSelf(true);
      return;
    }
    onClose();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">🎤</span>
          <span className="font-bold">{round.pitcher_name}</span>
          <Badge variant="outline">{round.product_name}</Badge>
          <Badge variant="outline">{round.challenge_type}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{round.challenge_prompt}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
          <Icon icon="clock" className="w-3.5 h-3.5" />
          Pitch time <strong className="text-foreground">{formatPitchTime(round.pitch_time_seconds)}</strong>
          <span>·</span> Completion <strong className="text-foreground">{round.completion_score}/3</strong>
        </p>
      </Card>

      <Card className="p-5 space-y-4 border-2 border-blue-200">
        <div className="flex items-center gap-2">
          <Icon icon="users" className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-bold">Room votes</span>
        </div>
        <WheelVoteProgress submitted={round.vote_count} expected={round.expected_count} />

        {waitingOn.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowWaiting((v) => !v)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Icon icon={showWaiting ? "chevron-up" : "chevron-down"} className="w-3 h-3" />
              {showWaiting ? "Hide" : "Show"} who hasn't voted ({waitingOn.length})
            </button>
            {showWaiting && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {waitingOn.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs font-normal">{name}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${round.pitcher_submitted ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
          <Icon icon={round.pitcher_submitted ? "check-circle" : "clock"} className="w-4 h-4" />
          {round.pitcher_submitted ? "Pitcher's self-eval is in" : "Waiting for the pitcher's self-eval..."}
        </div>

        {confirmNoSelf && !round.pitcher_submitted && (
          <p className="text-xs text-amber-800">
            The pitcher hasn't submitted a self-eval. Closing now still gives them +5 for pitching and the room bonus, but no self-awareness points. Click again to close anyway.
          </p>
        )}

        <Button
          onClick={handleClose}
          disabled={closing}
          className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold py-4 text-base rounded-xl"
        >
          {closing ? "Closing..." : confirmNoSelf && !round.pitcher_submitted ? "Close without self-eval" : "🔒 Close Scoring"}
        </Button>
      </Card>
    </div>
  );
}
