import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { executeApi } from "@/lib/executeApi";
import { createTimerSounds, type SoundOption } from "@/lib/timerSounds.js";

interface TimerState {
  running: boolean;
  remaining: number;
  totalSeconds: number;
  finished: boolean;
  label: string;
}

interface TimerContextType {
  state: TimerState;
  /** Counselors control the timer; everyone else only watches it. */
  canControl: boolean;
  start: (label?: string | null) => Promise<boolean>;
  pause: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  setLength: (seconds: number, label?: string | null) => Promise<boolean>;
  playSound: () => void;
  soundIndex: number;
  setSoundIndex: (i: number) => void;
  sounds: SoundOption[];
}

const TimerContext = createContext<TimerContextType | null>(null);

export function useTimerContext() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimerContext must be used within TimerProvider");
  return ctx;
}

type ServerTimer = {
  label: string;
  total_seconds: number;
  remaining_seconds: number;
  running: boolean;
  ends_at: string | null;
  server_now: string;
};

const errText = (e: unknown) =>
  e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

/**
 * One shared session timer, stored on the server. Counselors start/pause/reset it; every
 * cAMPer's Timer tab and floating timer count down to the same moment.
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useIsAdmin();
  const [soundIndex, setSoundIndex] = useState(0);
  const soundsRef = useRef<SoundOption[]>([]);
  const getSounds = useCallback(() => {
    if (soundsRef.current.length === 0) soundsRef.current = createTimerSounds();
    return soundsRef.current;
  }, []);
  const playSound = useCallback(() => getSounds()[soundIndex]?.play(), [soundIndex, getSounds]);

  // Latest server copy (from polling or from a counselor's own action).
  const [server, setServer] = useState<ServerTimer | null>(null);
  // Difference between the server clock and this device's clock, so every screen agrees.
  const clockSkew = useRef(0);

  const accept = useCallback((t: ServerTimer) => {
    const serverNow = new Date(t.server_now).getTime();
    if (!isNaN(serverNow)) clockSkew.current = serverNow - Date.now();
    setServer(t);
  }, []);

  const running = server?.running ?? false;
  const { data } = useApiData("GetSharedTimer", {}, { refetchInterval: running ? 3000 : 5000, refetchOnWindowFocus: true });
  useEffect(() => {
    if (data) accept(data as ServerTimer);
  }, [data, accept]);

  // Local tick for a smooth countdown between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const state: TimerState = useMemo(() => {
    if (!server) return { running: false, remaining: 600, totalSeconds: 600, finished: false, label: "" };
    let remaining = server.remaining_seconds;
    let isRunning = server.running;
    if (server.running && server.ends_at) {
      const endsAt = new Date(server.ends_at).getTime();
      remaining = Math.max(0, Math.ceil((endsAt - (now + clockSkew.current)) / 1000));
      if (remaining === 0) isRunning = false;
    }
    return {
      running: isRunning,
      remaining,
      totalSeconds: server.total_seconds,
      finished: !isRunning && remaining === 0 && server.total_seconds > 0,
      label: server.label,
    };
  }, [server, now]);

  // Counselor's device plays the alarm when time runs out (cAMPer phones stay quiet).
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && state.finished && isAdmin) {
      playSound();
      setTimeout(() => playSound(), 1500);
    }
    wasRunning.current = state.running;
  }, [state.running, state.finished, isAdmin, playSound]);

  const act = useCallback(
    async (action: "start" | "pause" | "reset" | "set", seconds: number | null, label: string | null) => {
      if (!isAdmin) return false;
      try {
        const t = await executeApi("UpdateSharedTimer", { action, seconds, label });
        accept(t as ServerTimer);
        return true;
      } catch (e) {
        toast.error("Timer didn't update: " + errText(e));
        return false;
      }
    },
    [isAdmin, accept]
  );

  const value: TimerContextType = {
    state,
    canControl: isAdmin,
    start: (label) => act("start", null, label ?? null),
    pause: () => act("pause", null, null),
    reset: () => act("reset", null, null),
    setLength: (seconds, label) => act("set", seconds, label ?? null),
    playSound,
    soundIndex,
    setSoundIndex,
    sounds: getSounds(),
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
