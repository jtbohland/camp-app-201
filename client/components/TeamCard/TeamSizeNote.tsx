import { Icon } from "@/components/ui/icon";

type Props = {
  memberCount: number;
  standardSize: number;
  rawPoints: number;
  totalPoints: number;
};

/**
 * Explains a size-adjusted team score: the team's average points per person are counted
 * as if the team had the standard number of members, so bigger teams don't win on headcount alone.
 */
export default function TeamSizeNote({ memberCount, standardSize, rawPoints, totalPoints }: Props) {
  return (
    <div
      className="mb-3 flex items-start gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] leading-snug text-sky-800"
      title={`Before the adjustment this team had ${rawPoints} pts.`}
    >
      <Icon icon="scale" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Scaled for team size: {memberCount} people scored as {standardSize} so every team competes fairly
        ({rawPoints} → {totalPoints} pts).
      </span>
    </div>
  );
}
