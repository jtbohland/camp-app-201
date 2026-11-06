import { toast } from "sonner";

type SubmitResult = {
  flagged: boolean;
  points_awarded: number;
  auto_completed: boolean;
  already_completed: boolean;
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
  } else if (result.flagged) {
    toast.warning(`${label} complete — your scores look off, so ${pts} pts. A counselor will review.`);
  } else if (pts > 0) {
    toast.success(`${label} complete! +${pts} pts 🏕️`);
    showPoints(pts);
  } else if (result.auto_completed) {
    toast.success(`${label} complete (already done in your role — no extra points).`);
  } else {
    toast.success(`${label} complete! (Pre-work points ended when cAMP started.)`);
  }
}

export function errorMessage(err: unknown): string {
  return err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : String(err);
}
