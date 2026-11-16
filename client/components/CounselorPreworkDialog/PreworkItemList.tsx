import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { formatPacificDay, todayPacific } from "@/lib/counselorPrework.js";

export type ChecklistItem = {
  key: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
};

type Props = {
  items: ChecklistItem[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  date: string;
  onDateChange: (date: string) => void;
};

function doneLabel(item: ChecklistItem): string {
  const day = item.completedAt
    ? new Date(item.completedAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" })
    : null;
  const who = item.completedBy ? "by a counselor" : "by cAMPer";
  return day ? `Done ${day} ${who}` : `Done ${who}`;
}

/** Step 1: pick the unfinished items and the day they were done. */
export default function PreworkItemList({ items, selected, onToggle, date, onDateChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1 rounded-lg border border-border p-2">
        {items.map((item) =>
          item.completed ? (
            <div key={item.key} className="flex items-center gap-2 rounded px-1 py-1 text-sm text-muted-foreground">
              <Icon icon="check-circle" className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="flex-1 truncate">{item.title}</span>
              <span className="shrink-0 text-[11px]">{doneLabel(item)}</span>
            </div>
          ) : (
            <label key={item.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
              <Checkbox checked={selected.has(item.key)} onCheckedChange={() => onToggle(item.key)} />
              <span className="flex-1 truncate">{item.title}</span>
            </label>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="prework-completed-on" className="text-sm font-medium text-foreground">
          Completed on
        </label>
        <input
          id="prework-completed-on"
          type="date"
          value={date}
          max={todayPacific()}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
        {date && <span className="text-xs text-muted-foreground">{formatPacificDay(date)}, saved as 12:00 PM PT</span>}
      </div>
    </div>
  );
}
