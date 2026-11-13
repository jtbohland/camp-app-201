import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import ReminderCountdown from "./ReminderCountdown";
import ReminderItemList, { type ReminderItem } from "./ReminderItemList";

export type PreworkReminderData = {
  items: ReminderItem[];
  completedCount: number;
  totalCount: number;
  pointsPerItem: number;
  deadline: string | null;
  penaltyPoints: number;
  penaltyApplied: boolean;
  earlyBird2DayBonus: number;
  earlyBird1DayBonus: number;
  earlyBirdGiven: boolean;
};

type Props = {
  data: PreworkReminderData;
  /** Unsaved profile: the button goes to the profile first (the rest of cAMP opens after it's saved). */
  profileCompleted: boolean;
  /** The only way out: close and open the Pre-work section of cAMP Journey. */
  onGoToJourney: () => void;
};

const HOUR = 3600 * 1000;

/**
 * Daily pre-work reminder for cAMPers with unfinished pre-work. Can't be closed (no X, Escape, or
 * click-outside); the single button takes them to the Pre-work section of cAMP Journey.
 */
export default function PreworkReminderModal({ data, profileCompleted, onGoToJourney }: Props) {
  const todo = useMemo(() => data.items.filter((i) => !i.completed), [data.items]);
  const done = useMemo(() => data.items.filter((i) => i.completed), [data.items]);

  // Worked out once when the modal opens; the countdown itself ticks live.
  const stakes = useMemo(() => {
    const msLeft = data.deadline ? new Date(data.deadline).getTime() - Date.now() : null;
    const overdue = msLeft !== null && msLeft <= 0;
    const perItem = overdue ? 0 : data.pointsPerItem;
    const earlyBird = data.earlyBirdGiven || msLeft === null ? 0 : msLeft >= 48 * HOUR ? data.earlyBird2DayBonus : msLeft >= 24 * HOUR ? data.earlyBird1DayBonus : 0;
    return { overdue, perItem, earlyBird, onTable: todo.length * perItem + earlyBird };
  }, [data, todo.length]);

  const pct = data.totalCount > 0 ? Math.round((data.completedCount / data.totalCount) * 100) : 0;

  return (
    <Dialog open onOpenChange={() => { /* closes only via the Journey button */ }}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-lg max-h-[92vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="mx-auto sm:mx-0 flex items-center justify-center w-11 h-11 rounded-full bg-red-500/10 mb-1">
            <Icon icon="clipboard-list" className="w-5 h-5 text-red-500" />
          </div>
          <DialogTitle>{stakes.overdue ? "Your pre-work is overdue" : "Your pre-work isn't finished"}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Pre-work is <span className="font-semibold text-foreground">mandatory for every cAMPer</span>. It was laid out
            in your original cAMP 201 invite, and by accepting your spot you accepted the responsibilities that come with
            it: pre-work, engagement, and full participation.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-camp-green transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {data.completedCount}/{data.totalCount} done
          </span>
        </div>

        <ReminderCountdown deadline={data.deadline} />

        <ReminderItemList variant="todo" items={todo} pointsAtStake={stakes.perItem} />
        <ReminderItemList variant="done" items={done} pointsAtStake={0} />

        <StakesNote data={data} stakes={stakes} />

        {!profileCompleted && (
          <p className="text-xs text-center text-muted-foreground -mb-2">
            Your profile is step one. Save it and the rest of your pre-work opens up in cAMP Journey.
          </p>
        )}
        <Button size="lg" onClick={onGoToJourney} className="w-full bg-camp-green hover:bg-camp-green/90 text-white">
          <Icon icon={profileCompleted ? "map" : "user"} className="w-4 h-4 mr-2" />
          {profileCompleted ? "Take me to cAMP Journey" : "Finish my profile first"}
          <Icon icon="arrow-right" className="w-4 h-4 ml-2" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function StakesNote({
  data,
  stakes,
}: {
  data: PreworkReminderData;
  stakes: { overdue: boolean; perItem: number; earlyBird: number; onTable: number };
}) {
  if (stakes.overdue) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
          <Icon icon="triangle-alert" className="w-3.5 h-3.5 text-red-500" /> What's at stake
        </p>
        {data.penaltyApplied
          ? `The deadline has passed and the -${data.penaltyPoints} pt missed-deadline penalty has been applied. `
          : data.penaltyPoints > 0
            ? `The deadline has passed, so a -${data.penaltyPoints} pt missed-deadline penalty applies. `
            : "The deadline has passed. "}
        Pre-work is still required: anything you finish now counts as done but earns 0 points.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
      <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
        <Icon icon="trophy" className="w-3.5 h-3.5 text-camp-amber" />
        <span>
          Up to <span className="text-camp-green">+{stakes.onTable} pts</span> still on the table
        </span>
      </p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>+{stakes.perItem} pts for each task finished before the deadline.</li>
        {stakes.earlyBird > 0 && (
          <li>
            Early-bird bonus: +{data.earlyBird2DayBonus} pts for finishing everything 2+ days early, +{data.earlyBird1DayBonus} for
            1–2 days early.
          </li>
        )}
        {data.penaltyPoints > 0 && (
          <li className="text-red-600 dark:text-red-400">
            Miss the deadline with anything unfinished: -{data.penaltyPoints} pts, and late tasks earn 0.
          </li>
        )}
      </ul>
    </div>
  );
}
