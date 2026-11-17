import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { PRODUCTS, type WheelProduct } from "@/lib/wheelData.js";
import { Icon } from "@/components/ui/icon";
import { isSoundOn, playClack, playLand, playSpinStart, setSoundOn, unlockSound } from "@/lib/wheelSounds.js";

type Props = {
  onLand: (product: WheelProduct) => void;
  disabled?: boolean;
  disabledLabel?: string;
  autoSpin?: boolean;
};

const NUM = PRODUCTS.length;
const SEG_DEG = 360 / NUM;          // degrees per slice
const SEG_RAD = (Math.PI * 2) / NUM; // radians per slice
const R = 260;
const CX = 290;
const CY = 290;
const SIZE = 580;

// ── Text position along the spoke ──
const TEXT_R = R * 0.54; // center text at ~54% of radius

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
function segPath(i: number): string {
  const a1 = i * SEG_RAD - Math.PI / 2;
  const a2 = (i + 1) * SEG_RAD - Math.PI / 2;
  const x1 = CX + R * Math.cos(a1);
  const y1 = CY + R * Math.sin(a1);
  const x2 = CX + R * Math.cos(a2);
  const y2 = CY + R * Math.sin(a2);
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
}

export default function SpinWheel({ onLand, disabled, disabledLabel, autoSpin }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [soundOn, setSoundOnState] = useState(isSoundOn);
  const animRef = useRef<number>(0);
  const lastSegRef = useRef(-1);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const spin = useCallback(() => {
    if (spinning || disabled) return;
    setSpinning(true);
    lastSegRef.current = -1;
    playSpinStart();

    const extra = 1440 + Math.random() * 720;
    const total = rotation + extra;
    const dur = 3500;
    const t0 = performance.now();
    const r0 = rotation;

    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const cur = r0 + extra * easeOutQuartic(p);
      setRotation(cur);

      const seg = Math.floor((((cur % 360) + 360) % 360) / SEG_DEG);
      if (seg !== lastSegRef.current && lastSegRef.current !== -1) playClack(1 - p);
      lastSegRef.current = seg;

      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setRotation(total);
        const fa = ((total % 360) + 360) % 360;
        const pa = (((360 - fa) % 360) + 360) % 360;
        const idx = Math.floor(pa / SEG_DEG) % NUM;
        const prod = PRODUCTS[idx];
        playLand();
        fireConfetti(prod.confettiEmojis);
        setTimeout(() => { setSpinning(false); onLand(prod); }, 600);
      }
    };
    animRef.current = requestAnimationFrame(tick);
  }, [spinning, disabled, rotation, onLand]);

  // Auto-spin when counselor selects a cAMPer
  useEffect(() => {
    if (autoSpin && !spinning) {
      const t = setTimeout(() => spin(), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpin]);

  const label = spinning ? "Spinning..." : disabled ? (disabledLabel ?? "🔒 Complete Eval First") : "Spin!";

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Pointer at 12 o'clock */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "11px solid transparent",
              borderRight: "11px solid transparent",
              borderTop: "24px solid #1a1a2e",
            }}
          />
        </div>

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="drop-shadow-xl"
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "none" : undefined }}
        >
          {PRODUCTS.map((p, i) => {
            // midDeg in our coordinate system (0° = 12 o'clock)
            const midDeg = (i + 0.5) * SEG_DEG;
            // SVG rotate() uses 0° = 3 o'clock, so subtract 90° to align
            const svgAngle = midDeg - 90;
            // Text reads left-to-right when the spoke aims rightward (SVG -90° to 90°).
            // When the spoke aims leftward (90° to 270°), rotate 180° so text stays readable.
            // Normalize svgAngle to [0,360) for the check:
            const n = ((svgAngle % 360) + 360) % 360;
            const flip = n > 90 && n <= 270;
            // When flipped, we rotate 180° extra. Text x positions stay positive
            // because +x now points back toward the segment (outward from center).
            const rotateDeg = flip ? svgAngle + 180 : svgAngle;

            return (
              <g key={p.id}>
                {/* Pie segment */}
                <path d={segPath(i)} fill={p.color} stroke="#fff" strokeWidth="2" />

                {/* Product name — flat text at the spoke midpoint */}
                {(() => {
                  // Compute absolute position of text center along the spoke
                  const rad = svgAngle * (Math.PI / 180);
                  const tx = CX + TEXT_R * Math.cos(rad);
                  const ty = CY + TEXT_R * Math.sin(rad);
                  // Text rotates to align with the spoke direction
                  const textAngle = flip ? svgAngle + 180 : svgAngle;
                  return (
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.95)"
                      fontSize={p.name.length > 20 ? "9" : p.name.length > 14 ? "10.5" : "13"}
                      fontWeight="800"
                      letterSpacing="0.5"
                      fontFamily="Inter, sans-serif"
                      className="uppercase select-none pointer-events-none"
                      transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                    >
                      {p.name.toUpperCase()}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Center hub */}
          <circle cx={CX} cy={CY} r="30" fill="#fff" />
          <circle cx={CX} cy={CY} r="14" fill="#2962FF" />
        </svg>
      </div>

      {/* Spin button */}
      <div className="flex items-center gap-3">
      <Button
        onClick={() => { unlockSound(); spin(); }}
        disabled={spinning || disabled}
        size="lg"
        className="text-xl font-extrabold px-14 py-7 rounded-2xl shadow-xl bg-[#2962FF] hover:bg-[#1e50d4] text-white disabled:opacity-50 transition-all"
      >
        {label}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={soundOn ? "Mute wheel sounds" : "Turn wheel sounds on"}
        title={soundOn ? "Sound on" : "Sound off"}
        onClick={() => {
          const next = !soundOn;
          setSoundOn(next);
          setSoundOnState(next);
          if (next) { unlockSound(); playLand(); }
        }}
      >
        <Icon icon={soundOn ? "volume-2" : "volume-x"} className="w-5 h-5" />
      </Button>
      </div>
    </div>
  );
}
