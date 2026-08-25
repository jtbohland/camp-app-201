import { useState, useCallback, useEffect, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type CheckInModalProps = {
  camperId: number;
  onClose: () => void;
};

export default function CheckInModal({ camperId, onClose }: CheckInModalProps) {
  const [word, setWord] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"word" | "pin" | "success">("word");

  const { data: checkinData } = useApiData("GetActiveCheckIn", {}, { refetchInterval: 3000 });
  const { run: submitCheckIn, loading: submitting } = useApi("SubmitCheckIn");

  const session = checkinData?.session;
  const currentWord = checkinData?.current_word;
  const teamsProgress = checkinData?.teams_progress ?? [];
  const checkinOpen = checkinData?.checkin_open ?? false;

  // Timing indicator
  const timerEndsAt = session ? new Date(session.timer_ends_at) : null;
  const now = new Date();
  const isEarly = timerEndsAt && now < timerEndsAt;
  const isGrace = timerEndsAt && !isEarly && now < new Date(timerEndsAt.getTime() + 60000);
  const isLate = timerEndsAt && !isEarly && !isGrace;

  // Find camper's team progress
  const myTeam = useMemo(() => {
    return teamsProgress.find((t) => t.team_id > 0) ?? null;
  }, [teamsProgress]);

  const handleWordSubmit = useCallback(() => {
    if (!word.trim()) return;
    setStep("pin");
  }, [word]);

  const handlePinSubmit = useCallback(async () => {
    if (pin.length !== 4 || !session) return;
    try {
      const result = await submitCheckIn({
        camper_id: camperId,
        session_id: session.id,
        word: word.trim(),
        pin,
      });
      if (result && result.success) {
        setStep("success");
        const timingLabel = result.timing === "early" ? "🟢 Early!" : result.timing === "on_time" ? "🟡 On time" : "🔴 Late";
        toast.success(`Checked in! ${timingLabel} (${result.points > 0 ? "+" : ""}${result.points} pts)${result.first_team ? " 🏆 Your team was FIRST!" : result.team_complete ? " ✅ Team complete!" : ""}`);
      } else if (result) {
        toast.error(result.error || "Check-in failed");
        if (result.error?.includes("word")) {
          setStep("word");
          setWord("");
        } else if (result.error?.includes("PIN")) {
          setPin("");
        }
      }
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : String(e);
      toast.error(msg);
    }
  }, [pin, word, session, camperId, submitCheckIn]);

  if (!checkinOpen || !session) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
          <Icon icon="clock" className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">Check-in not open yet</h2>
          <p className="text-sm text-muted-foreground mt-2">The check-in window will open when the timer nears its end.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
        {/* Timing indicator */}
        <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 mx-auto w-fit ${
          isEarly ? "bg-green-100 text-green-700" : isGrace ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isEarly ? "bg-green-500" : isGrace ? "bg-yellow-500" : "bg-red-500"} animate-pulse`} />
          {isEarly ? "Early — Bonus Points!" : isGrace ? "On Time" : "Late — Hurry!"}
        </div>

        {step === "word" && (
          <>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              <Icon icon="log-in" className="w-5 h-5 inline mr-2" />
              Check Back In
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Type the trail marker word shown on screen
            </p>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              placeholder="TRAIL MARKER WORD"
              className="w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground text-center text-lg font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-ring uppercase"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleWordSubmit()}
            />
            <button
              onClick={handleWordSubmit}
              disabled={!word.trim()}
              className="w-full mt-3 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Next →
            </button>
          </>
        )}

        {step === "pin" && (
          <>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              <Icon icon="lock" className="w-5 h-5 inline mr-2" />
              Enter Your PIN
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Your personal 4-digit code
            </p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="• • • •"
              className="w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              maxLength={4}
              onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handlePinSubmit()}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setStep("word"); setPin(""); }} className="flex-1 px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80">
                ← Back
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pin.length !== 4 || submitting}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Checking in..." : "Submit ✓"}
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🏕️</div>
            <h2 className="text-lg font-bold text-green-600">You're checked in!</h2>
            <p className="text-sm text-muted-foreground mt-2">Great job getting back on time.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90">
              Done
            </button>
          </div>
        )}

        {/* Team progress */}
        {step !== "success" && teamsProgress.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Team Progress</p>
            <div className="flex flex-col gap-1.5">
              {teamsProgress.slice(0, 5).map((team) => (
                <div key={team.team_id} className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${team.all_in ? "text-green-600" : "text-foreground"}`}>
                    {team.all_in && "✓ "}{team.team_name}
                  </span>
                  <span className="text-muted-foreground font-mono">{team.checked_in}/{team.total_members}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        {step !== "success" && (
          <button onClick={onClose} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground text-center">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
