import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTimerContext } from "@/components/TimerContext/index.js";
import { Icon } from "@/components/ui/icon";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function FloatingTimer() {
  const { state, start, pause, reset, playSound } = useTimerContext();
  const location = useLocation();
  const navigate = useNavigate();
  const onTimerPage = location.pathname === "/timer";

  // Dragging state
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const rect = ref.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 64, e.clientY - dragOffset.current.y)),
      });
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  // Only show if: (a) timer is running or finished, AND (b) user is NOT on the Timer page
  const showWidget = !onTimerPage && (state.running || state.finished || (state.remaining > 0 && state.remaining < state.totalSeconds));
  if (!showWidget) return null;

  const progress = state.totalSeconds > 0 ? ((state.totalSeconds - state.remaining) / state.totalSeconds) * 100 : 0;
  const isLow = state.remaining <= 30 && state.remaining > 0;

  return (
    <div
      ref={ref}
      className={`fixed z-[90] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border
        ${state.finished
          ? "bg-red-50 border-red-300 animate-pulse"
          : isLow
          ? "bg-amber-50 border-amber-300"
          : "bg-background border-border"
        }
      `}>
        {/* Progress ring */}
        <div className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/30"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${progress}, 100`}
              className={state.finished ? "text-red-500" : isLow ? "text-amber-500" : "text-emerald-500"}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
            state.finished ? "text-red-600" : "text-foreground"
          }`}>
            {formatTime(state.remaining)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {state.finished ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); playSound(); }}
                className="p-1 rounded hover:bg-red-100 text-red-600"
                title="Replay sound"
              >
                <Icon icon="volume-2" className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                title="Reset"
              >
                <Icon icon="rotate-ccw" className="w-4 h-4" />
              </button>
            </>
          ) : state.running ? (
            <button
              onClick={(e) => { e.stopPropagation(); pause(); }}
              className="p-1 rounded hover:bg-muted text-foreground"
              title="Pause"
            >
              <Icon icon="pause" className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); start(); }}
              className="p-1 rounded hover:bg-muted text-foreground"
              title="Resume"
            >
              <Icon icon="play" className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate("/timer"); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Go to Timer"
          >
            <Icon icon="maximize-2" className="w-4 h-4" />
          </button>
        </div>

        {/* Label */}
        {state.label && (
          <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">
            {state.label}
          </span>
        )}
      </div>
    </div>
  );
}
