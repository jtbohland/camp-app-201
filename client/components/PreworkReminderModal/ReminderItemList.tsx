import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

export type ReminderItem = {
  key: string;
  title: string;
  icon: string;
  completed: boolean;
  completedAt: string | null;
  pointsEarned: number | null;
};

type Props = {
  variant: "todo" | "done";
  items: ReminderItem[];
  /** Points each open item is worth right now (0 once the deadline has passed). */
  pointsAtStake: number;
};

/** Red "still to do" box with empty checkboxes, or green "done" box with checked ones. */
export default function ReminderItemList({ variant, items, pointsAtStake }: Props) {
  if (items.length === 0) return null;
  const todo = variant === "todo";

  return (
    <div
      className={`rounded-lg border p-3 ${
        todo ? "border-red-500/30 bg-red-500/5" : "border-camp-green/30 bg-camp-green/5"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${
          todo ? "text-red-600 dark:text-red-400" : "text-camp-green"
        }`}
      >
        <Icon icon={todo ? "circle-alert" : "circle-check"} className="w-3.5 h-3.5" />
        {todo ? `Still to do (${items.length})` : `Done (${items.length})`}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-center gap-2.5 rounded-md bg-background/70 border border-border/60 px-2.5 py-2"
          >
            {todo ? (
              <span className="w-4 h-4 rounded-[4px] border-2 border-red-500/70 flex-shrink-0" aria-label="Not done" />
            ) : (
              <span className="w-4 h-4 rounded-[4px] bg-camp-green flex items-center justify-center flex-shrink-0" aria-label="Done">
                <Icon icon="check" className="w-3 h-3 text-white" />
              </span>
            )}
            <Icon icon={(item.icon || "circle") as IconName} className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className={`text-sm flex-1 min-w-0 leading-snug ${todo ? "text-foreground" : "text-muted-foreground line-through decoration-camp-green/40"}`}>
              {item.title}
            </span>
            <PointsTag todo={todo} pointsAtStake={pointsAtStake} earned={item.pointsEarned} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PointsTag({ todo, pointsAtStake, earned }: { todo: boolean; pointsAtStake: number; earned: number | null }) {
  if (todo) {
    return (
      <span
        className={`text-xs font-bold tabular-nums flex-shrink-0 ${
          pointsAtStake > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
        }`}
      >
        {pointsAtStake > 0 ? `+${pointsAtStake} pts` : "0 pts"}
      </span>
    );
  }
  if (earned === null) return null;
  return (
    <span className="text-xs font-bold tabular-nums text-camp-green flex-shrink-0">
      {earned > 0 ? `+${earned}` : earned} pts
    </span>
  );
}
