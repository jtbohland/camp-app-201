import { toast } from "sonner";

type SubmitResult = {
  flagged: boolean;
  points_awarded: number;
  auto_completed: boolean;
  already_completed: boolean;
  /** Finished after the pre-work deadline: done, for 0 points. */
  past_deadline?: boolean;
};

/** One consistent toast for Challenger / Wheel & Deal completions, matching the real points result. */
export function showPreworkResultToast(
  label: string,
  result: SubmitResult,
  showPoints: (points: number) => void
) {
  const pts = Number(result.points_awarded) || 0;
  if (result.already_completed) {
    toast.info(`${label} is already complete.`);
  } else if (result.past_deadline && !result.flagged) {
    toast.success(`${label} complete: 0 pts (finished after the pre-work deadline).`);
  } else if (result.flagged) {
    toast.warning(`${label} complete — your scores look off, so ${pts} pts. A counselor will review.`);
  } else if (pts > 0) {
    toast.success(`${label} complete! +${pts} pts 🏕️`);
    showPoints(pts);
  } else if (result.auto_completed) {
    toast.success(`${label} complete (already done in cAMP Ascent onboarding).`);
  } else {
    toast.success(`${label} complete!`);
  }
}
