import { Icon } from "@/components/ui/icon";
import type { SoundOption } from "@/lib/timerSounds.js";

export const PRESET_TIMES = [
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
];

export const TIMER_MODES = [
  { value: "morning", label: "Morning", icon: "sunrise", checkin: true },
  { value: "break", label: "Back from Break", icon: "coffee", checkin: true },
  { value: "lunch", label: "Back from Lunch", icon: "utensils", checkin: true },
  { value: "prep", label: "Prep & Practice", icon: "pencil", checkin: false },
  { value: "presentation", label: "Presentation", icon: "presentation", checkin: false },
  { value: "custom", label: "Custom Timer", icon: "clock", checkin: false },
] as const;

type Props = {
  mode: string;
  onModeChange: (mode: string) => void;
  running: boolean;
  finished: boolean;
  remaining: number;
  totalSeconds: number;
  checkInActive: boolean;
  busy: boolean;
  onStart: (withCheckIn: boolean) => void;
  onPause: () => void;
  onReset: () => void;
  onCloseCheckIn: () => void;
  onSetLength: (seconds: number) => void;
  sounds: SoundOption[];
  soundIndex: number;
  onSoundChange: (i: number) => void;
  onTestSound: () => void;
};

/** Counselor-only controls for the shared timer and check-ins. */
export default function TimerControls(p: Props) {
  const isCheckinMode = TIMER_MODES.find((m) => m.value === p.mode)?.checkin ?? false;
  const locked = p.running || p.checkInActive;
  const startLabel = p.finished ? "Restart" : p.remaining < p.totalSeconds ? "Resume" : "Start";

  return (
    <>
      {/* Mode selector */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {TIMER_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => !locked && p.onModeChange(m.value)}
            disabled={locked}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              p.mode === m.value ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Icon icon={m.icon as any} className="w-3 h-3" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Start / pause / reset */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {!p.running ? (
          isCheckinMode && !p.checkInActive ? (
            <button
              onClick={() => p.onStart(true)}
              disabled={p.busy}
              className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Icon icon="play" className="w-4 h-4" />
              {startLabel} + Check-In
            </button>
          ) : (
            <button
              onClick={() => p.onStart(false)}
              disabled={p.busy}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Icon icon="play" className="w-4 h-4" />
              {startLabel}
            </button>
          )
        ) : (
          <button onClick={p.onPause} disabled={p.busy} className="flex items-center gap-2 px-5 py-3 bg-camp-amber text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            <Icon icon="pause" className="w-4 h-4" /> Pause
          </button>
        )}
        <button onClick={p.onReset} disabled={p.busy} className="flex items-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors disabled:opacity-50">
          <Icon icon="rotate-ccw" className="w-4 h-4" /> Reset
        </button>
        {p.checkInActive && (
          <button onClick={p.onCloseCheckIn} className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors">
            <Icon icon="x" className="w-4 h-4" /> Close Check-In
          </button>
        )}
        <button onClick={p.onTestSound} className="flex items-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors" title="Test sound">
          <Icon icon="volume-2" className="w-4 h-4" /> Test
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-col items-center gap-2 w-full max-w-md">
        <label className="text-sm font-medium text-muted-foreground">Quick Set</label>
        <div className="flex flex-wrap justify-center gap-2">
          {PRESET_TIMES.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => p.onSetLength(preset.seconds)}
              disabled={p.running || p.busy}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                p.totalSeconds === preset.seconds && !p.running ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom length + sound */}
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Custom:</label>
          <select
            value={Math.max(1, Math.floor(p.totalSeconds / 60))}
            onChange={(e) => p.onSetLength(Number(e.target.value) * 60)}
            disabled={p.running || p.busy}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Array.from({ length: 60 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Sound:</label>
          <div className="flex gap-1">
            {p.sounds.map((sound, i) => (
              <button
                key={sound.label}
                onClick={() => p.onSoundChange(i)}
                className={`px-2 py-1.5 rounded-lg text-sm transition-colors ${p.soundIndex === i ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}
                title={sound.label}
              >
                {sound.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
