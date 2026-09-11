import { createContext, useContext, useCallback, useState, type ReactNode } from "react";

type Bubble = { id: number; points: number };

const PointsBubbleContext = createContext<(points: number) => void>(() => {});

/** Hook to trigger a floating points bubble from any component */
export function usePointsBubble() {
  return useContext(PointsBubbleContext);
}

/** Wrap in App.tsx — provides showPointsBubble() globally */
export function PointsBubbleProvider({ children }: { children: ReactNode }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const show = useCallback((points: number) => {
    if (points <= 0) return;
    const id = Date.now() + Math.random();
    setBubbles((prev) => [...prev, { id, points }]);
    // Auto-remove after animation completes
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 2200);
  }, []);

  return (
    <PointsBubbleContext.Provider value={show}>
      {children}
      {/* Render bubbles in a fixed container */}
      <div className="fixed top-20 right-6 z-[9999] pointer-events-none flex flex-col items-end gap-1">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="animate-float-up text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg"
          >
            +{b.points} pts
          </div>
        ))}
      </div>
    </PointsBubbleContext.Provider>
  );
}
