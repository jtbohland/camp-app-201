import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type Camper = {
  id: number;
  first_name: string;
  last_name: string;
};

type Props = {
  campers: Camper[];
  onSelected: (camper: Camper) => void;
  onCancel: () => void;
};

function fireNameConfetti() {
  const emojis = ["🎤", "🎡", "🗣️"];
  const shapeFn = (confetti as any).shapeFromText;
  if (!shapeFn) {
    // Fallback: regular confetti
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    return;
  }
  emojis.forEach((emoji) => {
    const shape = shapeFn({ text: emoji, scalar: 3 });
    confetti({ particleCount: 20, angle: 60, spread: 55, origin: { x: 0.15, y: 0.5 }, shapes: [shape], scalar: 3, ticks: 250, gravity: 0.5, drift: 0.3, decay: 0.92 });
    confetti({ particleCount: 20, angle: 120, spread: 55, origin: { x: 0.85, y: 0.5 }, shapes: [shape], scalar: 3, ticks: 250, gravity: 0.5, drift: -0.3, decay: 0.92 });
  });
}

export default function CamperSelector({ campers, onSelected, onCancel }: Props) {
  const [phase, setPhase] = useState<"idle" | "drumroll" | "revealed">("idle");
  const [displayName, setDisplayName] = useState("");
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null);

  const pick = useCallback(() => {
    if (campers.length === 0) return;
    setPhase("drumroll");

    // Drumroll: rapidly cycle through names for 2 seconds
    const picked = campers[Math.floor(Math.random() * campers.length)];
    setSelectedCamper(picked);

    let tick = 0;
    const interval = setInterval(() => {
      const rand = campers[Math.floor(Math.random() * campers.length)];
      setDisplayName(`${rand.first_name} ${rand.last_name}`);
      tick++;
      if (tick > 20) {
        clearInterval(interval);
        setDisplayName(`${picked.first_name} ${picked.last_name}`);
        setPhase("revealed");
        fireNameConfetti();
      }
    }, 80);
  }, [campers]);

  // Auto-start drumroll on mount
  useEffect(() => {
    const t = setTimeout(pick, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-2xl p-10 max-w-lg w-full mx-4 text-center">
        {phase === "idle" && (
          <>
            <div className="text-6xl mb-4">🎡</div>
            <h2 className="text-2xl font-bold mb-2">Who's Pitching?</h2>
            <p className="text-muted-foreground mb-6">Let the wheel decide who steps up next!</p>
            <Button onClick={pick} size="lg" className="bg-[#2962FF] hover:bg-[#1e50d4] text-white font-bold px-10 py-6 text-lg rounded-xl">
              🎲 Pick a cAMPer
            </Button>
          </>
        )}

        {phase === "drumroll" && (
          <>
            <div className="text-5xl mb-4 animate-bounce">🎲</div>
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">Selecting...</h2>
            <div className="text-4xl font-extrabold text-foreground transition-all">
              {displayName}
            </div>
          </>
        )}

        {phase === "revealed" && selectedCamper && (
          <>
            <div className="text-6xl mb-2">🎤 🎡 🗣️</div>
            <h2 className="text-lg font-semibold text-muted-foreground mb-3">You're up!</h2>
            <div className="text-5xl font-black text-foreground mb-1 leading-tight">
              {selectedCamper.first_name}
            </div>
            <div className="text-5xl font-black text-foreground mb-6 leading-tight">
              {selectedCamper.last_name}
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => onSelected(selectedCamper)}
                size="lg"
                className="bg-[#2962FF] hover:bg-[#1e50d4] text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
              >
                🎡 Spin the Wheel!
              </Button>
              <Button
                onClick={pick}
                variant="outline"
                size="lg"
                className="font-semibold px-6 py-6 rounded-xl"
              >
                🎲 Re-pick
              </Button>
            </div>
            <button
              onClick={onCancel}
              className="mt-4 text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
