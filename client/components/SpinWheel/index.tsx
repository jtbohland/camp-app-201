import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { PRODUCTS, type WheelProduct } from "@/lib/wheelData.js";

type Props = {
  onLand: (product: WheelProduct) => void;
  disabled?: boolean;
  disabledLabel?: string;
};

const NUM = PRODUCTS.length;
const SEGMENT_ANGLE = 360 / NUM; // 45°
const RADIUS = 250;
const CENTER = 260;
const SVG_SIZE = 520;

// ── Tick sound via Web Audio API ──
function playTick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
    setTimeout(() => ctx.close(), 100);
  } catch {
    // Audio not available
  }
}

// ── Emoji confetti burst ──
function fireConfetti(emojis: string[]) {
  const shapeFn = (confetti as any).shapeFromText;
  if (!shapeFn) return;
  emojis.forEach((emoji) => {
    const shape = shapeFn({ text: emoji, scalar: 3 });
    confetti({ particleCount: 30, angle: 60, spread: 70, origin: { x: 0, y: 0.5 }, shapes: [shape], scalar: 3, ticks: 300, gravity: 0.4, drift: 0.5, decay: 0.92 });
    confetti({ particleCount: 30, angle: 120, spread: 70, origin: { x: 1, y: 0.5 }, shapes: [shape], scalar: 3, ticks: 300, gravity: 0.4, drift: -0.5, decay: 0.92 });
  });
}

// ── Quartic ease-out ──
function easeOutQuartic(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// ── SVG pie segment path ──
function segmentPath(i: number): string {
  const a1 = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  const a2 = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  const x1 = CENTER + RADIUS * Math.cos(a1);
  const y1 = CENTER + RADIUS * Math.sin(a1);
  const x2 = CENTER + RADIUS * Math.cos(a2);
  const y2 = CENTER + RADIUS * Math.sin(a2);
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;
}

export default function SpinWheel({ onLand, disabled, disabledLabel }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>(0);
  const lastSegRef = useRef(-1);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const spin = useCallback(() => {
    if (spinning || disabled) return;
    setSpinning(true);
    lastSegRef.current = -1;

    const extra = 1440 + Math.random() * 720;
    const total = rotation + extra;
    const dur = 3500;
    const t0 = performance.now();
    const r0 = rotation;

    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const cur = r0 + extra * easeOutQuartic(p);
      setRotation(cur);

      const seg = Math.floor((((cur % 360) + 360) % 360) / SEGMENT_ANGLE);
      if (seg !== lastSegRef.current && lastSegRef.current !== -1) playTick();
      lastSegRef.current = seg;

      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setRotation(total);
        const fa = ((total % 360) + 360) % 360;
        const pa = (((360 - fa) % 360) + 360) % 360;
        const idx = Math.floor(pa / SEGMENT_ANGLE) % NUM;
        const prod = PRODUCTS[idx];
        playTick();
        fireConfetti(prod.confettiEmojis);
        setTimeout(() => { setSpinning(false); onLand(prod); }, 600);
      }
    };
    animRef.current = requestAnimationFrame(tick);
  }, [spinning, disabled, rotation, onLand]);

  const label = spinning ? "Spinning..." : disabled ? (disabledLabel ?? "🔒 Complete Eval First") : "Spin!";

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Pointer (12 o'clock) */}
      <div className="relative" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-gray-800 drop-shadow-lg" />
        </div>

        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="drop-shadow-2xl"
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "none" : undefined }}
        >
          {/* Outer rim */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 4} fill="none" stroke="white" strokeWidth="8" opacity="0.3" />

          {/* Segments */}
          {PRODUCTS.map((p, i) => (
            <g key={p.id}>
              <path d={segmentPath(i)} fill={p.color} stroke="white" strokeWidth="2.5" />

              {/* Product name — radial text along the spoke, always readable */}
              {(() => {
                // midDeg is the absolute angle of the spoke bisector (0° = top/12 o'clock)
                const midDeg = (i + 0.5) * SEGMENT_ANGLE;
                // For segments whose spoke points roughly downward (90°–270°),
                // flip the text 180° so it reads from the rim inward instead of upside-down
                const flip = midDeg > 90 && midDeg < 270;
                const textR = RADIUS * 0.55; // distance from center
                const rad = (midDeg - 90) * (Math.PI / 180);
                const tx = CENTER + textR * Math.cos(rad);
                const ty = CENTER + textR * Math.sin(rad);
                const textAngle = flip ? midDeg + 180 : midDeg;
                return (
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="12.5"
                    fontWeight="800"
                    letterSpacing="1.5"
                    className="uppercase select-none pointer-events-none"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
                    transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                  >
                    {p.name}
                  </text>
                );
              })()}

              {/* Emoji near the outer edge */}
              {(() => {
                const midDeg = (i + 0.5) * SEGMENT_ANGLE;
                const emojiR = RADIUS * 0.82;
                const rad = (midDeg - 90) * (Math.PI / 180);
                const ex = CENTER + emojiR * Math.cos(rad);
                const ey = CENTER + emojiR * Math.sin(rad);
                return (
                  <text
                    x={ex}
                    y={ey}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="28"
                    className="select-none pointer-events-none"
                  >
                    {p.icon.slice(0, 2)}
                  </text>
                );
              })()}
            </g>
          ))}

          {/* Center hub */}
          <circle cx={CENTER} cy={CENTER} r="28" fill="white" stroke="white" strokeWidth="4" filter="url(#hubShadow)" />
          <circle cx={CENTER} cy={CENTER} r="10" fill="#2962FF" />

          {/* Shadow filter for hub */}
          <defs>
            <filter id="hubShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Spin button */}
      <Button
        onClick={spin}
        disabled={spinning || disabled}
        size="lg"
        className="text-xl font-extrabold px-14 py-7 rounded-2xl shadow-xl bg-[#2962FF] hover:bg-[#1e50d4] text-white disabled:opacity-50 transition-all"
      >
        {label}
      </Button>
    </div>
  );
}
