declare module "canvas-confetti" {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: any[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  interface ConfettiFunction {
    (options?: Options): Promise<null>;
    shapeFromText(options: { text: string; scalar?: number }): any;
    reset(): void;
  }

  const confetti: ConfettiFunction;
  export default confetti;
}
