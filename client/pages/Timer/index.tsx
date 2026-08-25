import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "@/components/ui/icon";

type SoundOption = {
  label: string;
  emoji: string;
  play: () => void;
};

function createSounds(): SoundOption[] {
  const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

  const playChirp = () => {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    // Bird chirp: quick ascending tones
    osc.frequency.setValueAtTime(1200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ac.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1800, ac.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(2800, ac.currentTime + 0.25);
    gain.gain.setValueAtTime(0.4, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.35);
    // Second chirp
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1400, ac.currentTime + 0.4);
    osc2.frequency.exponentialRampToValueAtTime(2600, ac.currentTime + 0.5);
    osc2.frequency.exponentialRampToValueAtTime(3200, ac.currentTime + 0.6);
    gain2.gain.setValueAtTime(0.4, ac.currentTime + 0.4);
    gain2.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.7);
    osc2.start(ac.currentTime + 0.4);
    osc2.stop(ac.currentTime + 0.7);
  };

  const playBear = () => {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sawtooth";
    // Bear roar: low rumbling with vibrato
    osc.frequency.setValueAtTime(80, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ac.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(60, ac.currentTime + 1.0);
    gain.gain.setValueAtTime(0.5, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, ac.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 1.2);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 1.2);
    // Add noise-like texture
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.type = "square";
    osc2.frequency.setValueAtTime(45, ac.currentTime);
    osc2.frequency.linearRampToValueAtTime(70, ac.currentTime + 0.3);
    osc2.frequency.linearRampToValueAtTime(35, ac.currentTime + 1.0);
    gain2.gain.setValueAtTime(0.15, ac.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 1.2);
    osc2.start(ac.currentTime);
    osc2.stop(ac.currentTime + 1.2);
  };

  const playOwl = () => {
    const ac = ctx();
    // Owl hoot: two low tones
    for (let i = 0; i < 2; i++) {
      const offset = i * 0.5;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(350, ac.currentTime + offset);
      osc.frequency.exponentialRampToValueAtTime(280, ac.currentTime + offset + 0.3);
      gain.gain.setValueAtTime(0.4, ac.currentTime + offset);
      gain.gain.setValueAtTime(0.4, ac.currentTime + offset + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + offset + 0.4);
      osc.start(ac.currentTime + offset);
      osc.stop(ac.currentTime + offset + 0.4);
    }
  };

  const playCampfire = () => {
    const ac = ctx();
    // Crackling sound: rapid random tones
    for (let i = 0; i < 12; i++) {
      const offset = i * 0.08 + Math.random() * 0.04;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(2000 + Math.random() * 4000, ac.currentTime + offset);
      gain.gain.setValueAtTime(0.05 + Math.random() * 0.1, ac.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + offset + 0.05);
      osc.start(ac.currentTime + offset);
      osc.stop(ac.currentTime + offset + 0.05);
    }
  };

  const playBugle = () => {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "triangle";
    // Bugle call: ascending military-style notes
    const notes = [392, 523, 659, 784, 659, 784]; // G4 C5 E5 G5 E5 G5
    const durations = [0.2, 0.2, 0.2, 0.4, 0.15, 0.5];
    let time = ac.currentTime;
    for (let i = 0; i < notes.length; i++) {
      osc.frequency.setValueAtTime(notes[i], time);
      time += durations[i];
    }
    gain.gain.setValueAtTime(0.35, ac.currentTime);
    gain.gain.setValueAtTime(0.35, ac.currentTime + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 1.65);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 1.65);
  };

  return [
    { label: "Bird Chirp", emoji: "🐦", play: playChirp },
    { label: "Bear Roar", emoji: "🐻", play: playBear },
    { label: "Owl Hoot", emoji: "🦉", play: playOwl },
    { label: "Campfire Crackle", emoji: "🔥", play: playCampfire },
    { label: "Bugle Call", emoji: "🎺", play: playBugle },
  ];
}

const PRESET_TIMES = [
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
];

export default function TimerPage() {
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [remaining, setRemaining] = useState(300);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [soundIndex, setSoundIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundsRef = useRef<SoundOption[]>([]);

  // Initialize sounds lazily
  const getSounds = useCallback(() => {
    if (soundsRef.current.length === 0) {
      soundsRef.current = createSounds();
    }
    return soundsRef.current;
  }, []);

  const playSound = useCallback(() => {
    const sounds = getSounds();
    sounds[soundIndex]?.play();
  }, [soundIndex, getSounds]);

  const start = useCallback(() => {
    if (remaining <= 0) return;
    setRunning(true);
    setFinished(false);
  }, [remaining]);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setFinished(false);
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  const setPreset = useCallback((seconds: number) => {
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setRunning(false);
    setFinished(false);
  }, []);

  // Timer tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  // Play sound on finish
  useEffect(() => {
    if (finished) {
      playSound();
      // Play again after a short delay for emphasis
      const t = setTimeout(() => playSound(), 1500);
      return () => clearTimeout(t);
    }
  }, [finished, playSound]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  const sounds = getSounds();

  return (
    <div className="flex flex-col items-center gap-8 p-6 w-full overflow-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Icon icon="timer" className="w-6 h-6 text-primary" />
          Session Timer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep activities on track with camp-themed alerts
        </p>
      </div>

      {/* Timer Display */}
      <div className="relative flex items-center justify-center">
        {/* Circular progress ring */}
        <svg className="w-64 h-64 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="currentColor"
            className="text-muted/30"
            strokeWidth="4"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="currentColor"
            className={finished ? "text-camp-amber" : "text-primary"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-5xl font-mono font-bold ${finished ? "text-camp-amber animate-pulse" : "text-foreground"}`}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          {finished && (
            <span className="text-sm font-medium text-camp-amber mt-1">Time's up!</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!running ? (
          <button
            onClick={start}
            disabled={remaining <= 0 && !finished}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Icon icon="play" className="w-4 h-4" />
            {finished ? "Restart" : remaining < totalSeconds ? "Resume" : "Start"}
          </button>
        ) : (
          <button
            onClick={pause}
            className="flex items-center gap-2 px-6 py-3 bg-camp-amber text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Icon icon="pause" className="w-4 h-4" />
            Pause
          </button>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors"
        >
          <Icon icon="rotate-ccw" className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={playSound}
          className="flex items-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors"
          title="Test sound"
        >
          <Icon icon="volume-2" className="w-4 h-4" />
          Test
        </button>
      </div>

      {/* Time Presets */}
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <label className="text-sm font-medium text-muted-foreground">Quick Set</label>
        <div className="flex flex-wrap justify-center gap-2">
          {PRESET_TIMES.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => setPreset(preset.seconds)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                totalSeconds === preset.seconds && !running
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Time */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Custom:</label>
        <select
          value={Math.floor(totalSeconds / 60)}
          onChange={(e) => setPreset(Number(e.target.value) * 60)}
          disabled={running}
          className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 60 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m} min</option>
          ))}
        </select>
      </div>

      {/* Sound Selector */}
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <label className="text-sm font-medium text-muted-foreground">Alert Sound</label>
        <div className="flex flex-wrap justify-center gap-2">
          {sounds.map((sound, i) => (
            <button
              key={sound.label}
              onClick={() => setSoundIndex(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                soundIndex === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              <span>{sound.emoji}</span>
              <span>{sound.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
