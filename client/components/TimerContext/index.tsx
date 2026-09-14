import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

type SoundOption = { label: string; emoji: string; play: () => void };

interface TimerState {
  running: boolean;
  remaining: number;
  totalSeconds: number;
  finished: boolean;
  label: string;
}

interface TimerContextType {
  state: TimerState;
  setTimerState: (s: Partial<TimerState>) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  playSound: () => void;
  soundIndex: number;
  setSoundIndex: (i: number) => void;
  sounds: SoundOption[];
}

const defaultState: TimerState = {
  running: false,
  remaining: 600,
  totalSeconds: 600,
  finished: false,
  label: "",
};

const TimerContext = createContext<TimerContextType | null>(null);

export function useTimerContext() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimerContext must be used within TimerProvider");
  return ctx;
}

function createSoundsLazy(): SoundOption[] {
  const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

  const playChirp = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ac.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(2800, ac.currentTime + 0.25);
    gain.gain.setValueAtTime(0.4, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.7);
  };

  const playBear = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ac.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(60, ac.currentTime + 1.0);
    gain.gain.setValueAtTime(0.5, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 1.2);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 1.2);
  };

  const playOwl = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(400, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.6);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.6);
  };

  const playFire = () => {
    const ac = ctx();
    const bufferSize = ac.sampleRate * 0.8;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = ac.createBufferSource(); const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    filter.type = "lowpass"; filter.frequency.value = 600;
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.8);
    source.start(ac.currentTime);
  };

  const playBugle = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "triangle";
    [523, 659, 784, 1047].forEach((freq, i) => osc.frequency.setValueAtTime(freq, ac.currentTime + i * 0.2));
    gain.gain.setValueAtTime(0.4, ac.currentTime);
    gain.gain.setValueAtTime(0.4, ac.currentTime + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.9);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.9);
  };

  return [
    { label: "Chirp", emoji: "🐦", play: playChirp },
    { label: "Bear", emoji: "🐻", play: playBear },
    { label: "Owl", emoji: "🦉", play: playOwl },
    { label: "Fire", emoji: "🔥", play: playFire },
    { label: "Bugle", emoji: "🎺", play: playBugle },
  ];
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<TimerState>(defaultState);
  const [soundIndex, setSoundIndex] = useState(0);
  const soundsRef = useRef<SoundOption[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getSounds = useCallback(() => {
    if (soundsRef.current.length === 0) soundsRef.current = createSoundsLazy();
    return soundsRef.current;
  }, []);

  const playSound = useCallback(() => {
    getSounds()[soundIndex]?.play();
  }, [soundIndex, getSounds]);

  const setTimerState = useCallback((partial: Partial<TimerState>) => {
    setStateRaw((prev) => ({ ...prev, ...partial }));
  }, []);

  // Interval-based countdown
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.running && state.remaining > 0) {
      intervalRef.current = setInterval(() => {
        setStateRaw((prev) => {
          if (prev.remaining <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            // Play sound on finish
            setTimeout(() => {
              getSounds()[soundIndex]?.play();
            }, 50);
            return { ...prev, remaining: 0, running: false, finished: true };
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.running, soundIndex, getSounds]);

  const start = useCallback(() => {
    if (state.remaining > 0) {
      setStateRaw((prev) => ({ ...prev, running: true, finished: false }));
    }
  }, [state.remaining]);

  const pause = useCallback(() => {
    setStateRaw((prev) => ({ ...prev, running: false }));
  }, []);

  const reset = useCallback(() => {
    setStateRaw((prev) => ({ ...prev, running: false, finished: false, remaining: prev.totalSeconds }));
  }, []);

  return (
    <TimerContext.Provider
      value={{ state, setTimerState, start, pause, reset, playSound, soundIndex, setSoundIndex, sounds: getSounds() }}
    >
      {children}
    </TimerContext.Provider>
  );
}
