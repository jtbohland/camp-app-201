import { Progress } from "@/components/ui/progress";

type Props = {
  submitted: number;
  expected: number;
  /** Smaller version for cAMPer screens. */
  compact?: boolean;
};

/** "9 of 22 submitted" with a progress bar. Expected = eligible cAMPers minus the pitcher. */
export default function WheelVoteProgress({ submitted, expected, compact }: Props) {
  const pct = expected > 0 ? Math.min(100, Math.round((submitted / expected) * 100)) : 0;
  const allIn = expected > 0 && submitted >= expected;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={compact ? "text-sm font-semibold" : "text-lg font-bold"}>
          {submitted} of {expected} submitted
        </span>
        <span className={`text-xs font-medium ${allIn ? "text-green-700" : "text-muted-foreground"}`}>
          {allIn ? "Everyone's in" : `${Math.max(0, expected - submitted)} to go`}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
