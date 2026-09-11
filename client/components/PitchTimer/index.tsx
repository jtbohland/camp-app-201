import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type Props = {
  onStop: (elapsedSeconds: number) => void;
};

const DEFAULT_DURATION = 120; // 2 minutes

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timerColor(remaining: number): string {
  if (remaining <= 30) return "text-red-500";
  if (remaining <= 60) return "text-orange-500";
  return "text-green-600";
}

function progressColor(remaining: number): string {
  if (remaining <= 30) return "bg-red-500";
  if (remaining <= 60) return "bg-orange-500";
  return "bg-green-500";
}

export default function PitchTimer({ onStop }: Props) {
  const [state, setState] = useState<"idle" | "running" | "stopped">("idle");
  const [remaining, setRemaining] = useState(DEFAULT_DURATION);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = useCallback(() => {
    setState("running");
    setRemaining(DEFAULT_DURATION);
    setElapsed(0);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Timer hit 0
          clearInterval(intervalRef.current!);
          setState("stopped");
          setElapsed(DEFAULT_DURATION);
          return 0;
        }
        setElapsed((e) => e + 1);
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("stopped");
    onStop(elapsed + 1); // +1 for the current second
  }, [elapsed, onStop]);

  // Auto-call onStop when timer hits 0
  useEffect(() => {
    if (state === "stopped" && remaining === 0) {
      onStop(DEFAULT_DURATION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, remaining]);

  const pct = ((DEFAULT_DURATION - remaining) / DEFAULT_DURATION) * 100;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="timer" className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Pitch Timer</h3>
      </div>

      {/* Timer display */}
      <div className="flex flex-col items-center gap-3">
        <div className={`text-6xl font-mono font-bold tabular-nums ${timerColor(remaining)}`}>
          {formatTime(remaining)}
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${progressColor(remaining)}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Controls */}
        {state === "idle" && (
          <Button onClick={start} size="lg" className="mt-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8">
            <Icon icon="play" className="w-5 h-5 mr-2" />
            Start Timer
          </Button>
        )}
        {state === "running" && (
          <Button onClick={stop} size="lg" variant="destructive" className="mt-2 font-bold px-8">
            <Icon icon="square" className="w-5 h-5 mr-2" />
            Stop
          </Button>
        )}
        {state === "stopped" && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Icon icon="check-circle" className="w-4 h-4 text-green-500" />
            Pitch time: <span className="font-bold text-foreground">{formatTime(elapsed)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
