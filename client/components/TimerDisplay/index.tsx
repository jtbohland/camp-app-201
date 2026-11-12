type Props = {
  remaining: number;
  totalSeconds: number;
  finished: boolean;
  checkinOpen: boolean;
  /** Bigger ring for cAMPers watching on their own screen. */
  large?: boolean;
};

/** The countdown ring everyone sees. */
export default function TimerDisplay({ remaining, totalSeconds, finished, checkinOpen, large }: Props) {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg className={`${large ? "w-72 h-72" : "w-56 h-56"} -rotate-90`} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="4" />
        <circle
          cx="50" cy="50" r="45" fill="none" stroke="currentColor"
          className={finished ? "text-camp-amber" : checkinOpen ? "text-green-500" : "text-primary"}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          style={{ transition: "stroke-dashoffset 0.3s linear" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`${large ? "text-6xl" : "text-5xl"} font-mono font-bold ${finished ? "text-camp-amber animate-pulse" : "text-foreground"}`}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        {finished && <span className="text-sm font-medium text-camp-amber mt-1">Time's up!</span>}
        {checkinOpen && !finished && <span className="text-xs font-medium text-green-600 mt-1">Check-in OPEN</span>}
      </div>
    </div>
  );
}
