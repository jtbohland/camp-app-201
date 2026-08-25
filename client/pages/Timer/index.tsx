import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type SoundOption = { label: string; emoji: string; play: () => void };

function createSounds(): SoundOption[] {
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
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => { osc.frequency.setValueAtTime(freq, ac.currentTime + i * 0.2); });
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

const PRESET_TIMES = [
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
];

const CHECKIN_LABELS = ["Morning", "Post-lunch", "After break", "After breakout"];

export default function TimerPage() {
  const [totalSeconds, setTotalSeconds] = useState(600);
  const [remaining, setRemaining] = useState(600);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [soundIndex, setSoundIndex] = useState(0);
  const [checkinLabel, setCheckinLabel] = useState("After break");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundsRef = useRef<SoundOption[]>([]);

  // Current camper data (for admin check)
  const { data: camperData } = useApiData("GetCurrentCamper", { email: "" });
  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";

  // Active check-in polling (every 3 seconds when session is active)
  const { data: checkinData, refetch: refetchCheckin } = useApiData("GetActiveCheckIn", {}, {
    refetchInterval: activeSessionId ? 3000 : 15000,
  });

  // APIs
  const { run: startCheckIn } = useApi("StartCheckIn");
  const { run: closeCheckIn } = useApi("CloseCheckIn");

  // Sync active session from server
  useEffect(() => {
    if (checkinData?.active && checkinData.session) {
      setActiveSessionId(checkinData.session.id);
    }
  }, [checkinData]);

  const getSounds = useCallback(() => {
    if (soundsRef.current.length === 0) soundsRef.current = createSounds();
    return soundsRef.current;
  }, []);

  const playSound = useCallback(() => {
    getSounds()[soundIndex]?.play();
  }, [soundIndex, getSounds]);

  const startTimer = useCallback(async (withCheckin: boolean) => {
    if (remaining <= 0) return;
    setRunning(true);
    setFinished(false);

    if (withCheckin && isAdmin) {
      try {
        const result = await startCheckIn({
          label: checkinLabel,
          duration_minutes: Math.ceil(totalSeconds / 60),
          counselor_id: camperData!.camper!.id,
        });
        if (result) {
          setActiveSessionId(result.session_id);
        }
        await refetchCheckin();
        toast.success(`Check-in started: "${checkinLabel}"`);
      } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : String(e);
        toast.error("Failed to start check-in: " + msg);
      }
    }
  }, [remaining, isAdmin, checkinLabel, totalSeconds, camperData, startCheckIn, refetchCheckin]);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false); setFinished(false); setRemaining(totalSeconds);
  }, [totalSeconds]);

  const setPreset = useCallback((seconds: number) => {
    setTotalSeconds(seconds); setRemaining(seconds); setRunning(false); setFinished(false);
  }, []);

  const handleCloseCheckIn = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const result = await closeCheckIn({ session_id: activeSessionId });
      setActiveSessionId(null);
      await refetchCheckin();
      if (result) {
        const s = result.summary;
        toast.success(
          `Check-in closed! ${s.early_count} early, ${s.on_time_count} on-time, ${s.late_count} late, ${s.missed_count} missed${s.first_team_name ? ` — 🏆 ${s.first_team_name} first!` : ""}`
        );
      }
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : String(e);
      toast.error("Failed to close check-in: " + msg);
    }
  }, [activeSessionId, closeCheckIn, refetchCheckin]);

  // Timer tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { setRunning(false); setFinished(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Play sound on finish
  useEffect(() => {
    if (finished) {
      playSound();
      const t = setTimeout(() => playSound(), 1500);
      return () => clearTimeout(t);
    }
  }, [finished, playSound]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const sounds = getSounds();

  // Check-in state
  const checkinOpen = checkinData?.checkin_open ?? false;
  const currentWord = checkinData?.current_word ?? null;
  const teamsProgress = checkinData?.teams_progress ?? [];

  return (
    <div className="flex flex-col items-center gap-6 p-6 w-full overflow-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Icon icon="timer" className="w-6 h-6 text-primary" />
          Session Timer
        </h1>
        {activeSessionId && (
          <p className="text-sm text-primary font-medium mt-1">
            Check-in active: {checkinData?.session?.label}
          </p>
        )}
      </div>

      {/* Timer Display */}
      <div className="relative flex items-center justify-center">
        <svg className="w-56 h-56 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="45" fill="none" stroke="currentColor"
            className={finished ? "text-camp-amber" : checkinOpen ? "text-green-500" : "text-primary"}
            strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-5xl font-mono font-bold ${finished ? "text-camp-amber animate-pulse" : "text-foreground"}`}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          {finished && <span className="text-sm font-medium text-camp-amber mt-1">Time's up!</span>}
          {checkinOpen && !finished && <span className="text-xs font-medium text-green-600 mt-1">Check-in OPEN</span>}
        </div>
      </div>

      {/* Rotating Word (visible when check-in is open) */}
      {checkinOpen && currentWord && (
        <div className="bg-card border border-border rounded-xl px-8 py-4 text-center shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Trail Marker</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-primary">{currentWord}</p>
          <p className="text-xs text-muted-foreground mt-1">Changes every 15 seconds</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {!running ? (
          <>
            {isAdmin && !activeSessionId && (
              <button
                onClick={() => startTimer(true)}
                disabled={remaining <= 0 && !finished}
                className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Icon icon="play" className="w-4 h-4" />
                Start + Check-In
              </button>
            )}
            <button
              onClick={() => startTimer(false)}
              disabled={remaining <= 0 && !finished}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Icon icon="play" className="w-4 h-4" />
              {finished ? "Restart" : remaining < totalSeconds ? "Resume" : "Start"}
            </button>
          </>
        ) : (
          <button onClick={pause} className="flex items-center gap-2 px-5 py-3 bg-camp-amber text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
            <Icon icon="pause" className="w-4 h-4" /> Pause
          </button>
        )}
        <button onClick={reset} className="flex items-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors">
          <Icon icon="rotate-ccw" className="w-4 h-4" /> Reset
        </button>
        {isAdmin && activeSessionId && (
          <button onClick={handleCloseCheckIn} className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors">
            <Icon icon="x" className="w-4 h-4" /> Close Check-In
          </button>
        )}
        <button onClick={playSound} className="flex items-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors" title="Test sound">
          <Icon icon="volume-2" className="w-4 h-4" /> Test
        </button>
      </div>

      {/* Check-In Label selector (admin only) */}
      {isAdmin && !activeSessionId && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Check-in label:</label>
          <select
            value={checkinLabel}
            onChange={(e) => setCheckinLabel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CHECKIN_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      )}

      {/* Time Presets */}
      <div className="flex flex-col items-center gap-2 w-full max-w-md">
        <label className="text-sm font-medium text-muted-foreground">Quick Set</label>
        <div className="flex flex-wrap justify-center gap-2">
          {PRESET_TIMES.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => setPreset(preset.seconds)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${totalSeconds === preset.seconds && !running ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Time + Sound */}
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Custom:</label>
          <select
            value={Math.floor(totalSeconds / 60)}
            onChange={(e) => setPreset(Number(e.target.value) * 60)}
            disabled={running}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Array.from({ length: 60 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Sound:</label>
          <div className="flex gap-1">
            {sounds.map((sound, i) => (
              <button
                key={sound.label}
                onClick={() => setSoundIndex(i)}
                className={`px-2 py-1.5 rounded-lg text-sm transition-colors ${soundIndex === i ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}
                title={sound.label}
              >
                {sound.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Team Race Leaderboard (visible when check-in active) */}
      {activeSessionId && teamsProgress.length > 0 && (
        <div className="w-full max-w-lg bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon icon="trophy" className="w-4 h-4 text-camp-amber" />
            Team Race
          </h3>
          <div className="flex flex-col gap-2">
            {teamsProgress.map((team, idx) => (
              <div key={team.team_id} className={`flex items-center justify-between p-2 rounded-lg ${team.all_in ? "bg-green-50 border border-green-200" : "bg-muted/50"}`}>
                <div className="flex items-center gap-2">
                  {team.all_in && idx === 0 && <span className="text-lg">🏆</span>}
                  <span className="text-sm font-medium text-foreground">{team.team_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${team.all_in ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${team.total_members > 0 ? (team.checked_in / team.total_members) * 100 : 0}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono font-bold ${team.all_in ? "text-green-600" : "text-muted-foreground"}`}>
                    {team.checked_in}/{team.total_members}
                  </span>
                  {team.all_in && <Icon icon="check-circle" className="w-4 h-4 text-green-600" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
