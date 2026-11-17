// Game-show sound effects for Wheel & Deal, made with the Web Audio API (no audio files).
// One shared audio context, unlocked on the counselor's first click so browsers allow playback.

const STORAGE_KEY = "camp201_wheel_sound";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundOn(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable: the setting just won't persist.
  }
}

/** Call from a click handler so later (timer-driven) sounds are allowed to play. */
export function unlockSound(): void {
  audio();
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  opts: { type?: OscillatorType; vol?: number; slideTo?: number } = {}
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
  const vol = opts.vol ?? 0.15;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Rising "whoosh" when the wheel starts spinning. */
export function playSpinStart(): void {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const len = Math.floor(ac.sampleRate * 0.6);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(300, t);
  filter.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
  filter.Q.value = 1.2;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start(t);
  tone(ac, 220, t, 0.45, { type: "sawtooth", vol: 0.05, slideTo: 880 });
}

/** Wooden "clack" as the pointer passes a slice. `speed` 0..1 lifts the pitch while it's fast. */
export function playClack(speed = 0.5): void {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 900 + speed * 700, t, 0.035, { type: "square", vol: 0.07 });
  tone(ac, 180, t, 0.05, { type: "sine", vol: 0.08 });
}

/** Ta-da fanfare when the wheel lands. */
export function playLand(): void {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((f, i) => tone(ac, f, t + i * 0.09, 0.18, { vol: 0.16 }));
  // Final chord
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(ac, f, t + 0.3, 0.7, { vol: 0.1 }));
  tone(ac, 1567.98, t + 0.3, 0.5, { type: "sine", vol: 0.05 });
}

/** Quick drumroll tap while the cAMPer picker cycles names. */
export function playDrum(): void {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 140 + Math.random() * 30, t, 0.06, { type: "triangle", vol: 0.12, slideTo: 90 });
}

/** Cymbal-style hit + chime when the pitcher is revealed. */
export function playReveal(): void {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 110, t, 0.35, { type: "triangle", vol: 0.25, slideTo: 60 });
  [783.99, 1046.5, 1318.51].forEach((f, i) => tone(ac, f, t + 0.05 + i * 0.06, 0.4, { type: "sine", vol: 0.09 }));
}
