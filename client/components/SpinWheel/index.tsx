import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { PRODUCTS, type WheelProduct } from "@/lib/wheelData.js";

type Props = {
  onLand: (product: WheelProduct) => void;
  disabled?: boolean;
  disabledLabel?: string;
};

const SEGMENT_ANGLE = 360 / PRODUCTS.length; // 45°
const RADIUS = 170;
const CENTER = 200;
const SVG_SIZE = 400;

// ── Tick sound via Web Audio API ──
function playTick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
    setTimeout(() => ctx.close(), 100);
  } catch {
    // Audio not available
  }
}

// ── Emoji confetti burst ──
function fireConfetti(emojis: string[]) {
  const shapeFromText = (confetti as any).shapeFromText;
  if (!shapeFromText) return; // fallback if API not available

  emojis.forEach((emoji) => {
    const shape = shapeFromText({ text: emoji, scalar: 3 });
    // Left burst
    confetti({
      particleCount: 30,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.5 },
      shapes: [shape],
      scalar: 3,
      ticks: 300,
      gravity: 0.4,
      drift: 0.5,
      decay: 0.92,
    });
    // Right burst
    confetti({
      particleCount: 30,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.5 },
      shapes: [shape],
      scalar: 3,
      ticks: 300,
      gravity: 0.4,
      drift: -0.5,
      decay: 0.92,
    });
  });
}

// ── Quartic ease-out ──
function easeOutQuartic(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// ── SVG pie segment path ──
function segmentPath(index: number): string {
  const startAngle = (index * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  const endAngle = ((index + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  const x1 = CENTER + RADIUS * Math.cos(startAngle);
  const y1 = CENTER + RADIUS * Math.sin(startAngle);
  const x2 = CENTER + RADIUS * Math.cos(endAngle);
  const y2 = CENTER + RADIUS * Math.sin(endAngle);
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;
}

// ── Text position along spoke ──
function textTransform(index: number): string {
  const midAngle = (index + 0.5) * SEGMENT_ANGLE - 90;
  return `rotate(${midAngle}, ${CENTER}, ${CENTER})`;
}

export default function SpinWheel({ onLand, disabled, disabledLabel }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const animFrameRef = useRef<number>(0);
  const lastSegRef = useRef(-1);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const spin = useCallback(() => {
    if (spinning || disabled) return;
    setSpinning(true);
    lastSegRef.current = -1;

    const extraRotation = 1440 + Math.random() * 720; // 4–6 full spins
    const totalRotation = rotation + extraRotation;
    const duration = 3500;
    const startTime = performance.now();
    const startRotation = rotation;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuartic(progress);
      const currentRotation = startRotation + extraRotation * eased;
      setRotation(currentRotation);

      // Tick on segment boundary crossing
      const normalizedAngle = ((currentRotation % 360) + 360) % 360;
      const currentSeg = Math.floor(normalizedAngle / SEGMENT_ANGLE);
      if (currentSeg !== lastSegRef.current && lastSegRef.current !== -1) {
        playTick();
      }
      lastSegRef.current = currentSeg;

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Landed!
        setRotation(totalRotation);
        // Calculate which segment the pointer (top, 12 o'clock) points to
        // Pointer is at 0° (top). Wheel rotated clockwise by totalRotation.
        // The segment under the pointer: normalize the rotation, find which segment.
        const finalAngle = ((totalRotation % 360) + 360) % 360;
        // Pointer at top = 0°. Wheel rotated clockwise means segment 0 starts at 0°.
        // The segment at the pointer is the one at (360 - finalAngle).
        const pointerAngle = ((360 - finalAngle) % 360 + 360) % 360;
        const landedIndex = Math.floor(pointerAngle / SEGMENT_ANGLE) % PRODUCTS.length;
        const landedProduct = PRODUCTS[landedIndex];

        playTick();
        fireConfetti(landedProduct.confettiEmojis);

        setTimeout(() => {
          setSpinning(false);
          onLand(landedProduct);
        }, 600);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [spinning, disabled, rotation, onLand]);

  const buttonLabel = spinning
    ? "Spinning..."
    : disabled
    ? disabledLabel ?? "🔒 Complete Eval First"
    : "Spin!";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pointer (top, 12 o'clock) */}
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-gray-800 drop-shadow-md" />
        </div>

        {/* SVG Wheel */}
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="drop-shadow-xl"
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "none" : undefined }}
        >
          {/* Segments */}
          {PRODUCTS.map((product, i) => (
            <g key={product.id}>
              <path d={segmentPath(i)} fill={product.color} stroke="white" strokeWidth="2" />
              {/* Product name along spoke */}
              <text
                transform={textTransform(i)}
                x={CENTER}
                y={CENTER - RADIUS * 0.38}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="700"
                className="uppercase tracking-wider select-none pointer-events-none"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
              >
                {product.name.length > 16 ? product.name.split("+")[0].trim() : product.name}
              </text>
              {/* Icon */}
              <text
                transform={textTransform(i)}
                x={CENTER}
                y={CENTER - RADIUS * 0.62}
                textAnchor="middle"
                fontSize="22"
                className="select-none pointer-events-none"
              >
                {product.icon.slice(0, 2)}
              </text>
            </g>
          ))}
          {/* Center hub */}
          <circle cx={CENTER} cy={CENTER} r="30" fill="white" stroke="#e2e8f0" strokeWidth="3" />
          <text x={CENTER} y={CENTER + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b" className="select-none">
            W&D
          </text>
        </svg>
      </div>

      {/* Spin button */}
      <Button
        onClick={spin}
        disabled={spinning || disabled}
        size="lg"
        className="text-lg font-bold px-10 py-6 rounded-xl shadow-lg bg-[#2962FF] hover:bg-[#1e50d4] text-white disabled:opacity-50"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
