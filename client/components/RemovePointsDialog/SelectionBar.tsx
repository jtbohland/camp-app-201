import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Props = {
  count: number;
  /** Net change to totals if the selection is removed. */
  netChange: number;
  onRemove: () => void;
  onClear: () => void;
};

/** Sticky bar shown while a counselor has point entries selected. */
export default function SelectionBar({ count, netChange, onRemove, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/80 px-3 py-2 backdrop-blur print:hidden">
      <span className="text-xs text-foreground">
        <span className="font-semibold">{count} selected</span>
        <span className="ml-1.5 text-muted-foreground">
          · net {netChange > 0 ? `+${netChange}` : netChange} pts if removed
        </span>
      </span>
      <div className="flex gap-1.5">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          Clear
        </Button>
        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onRemove}>
          <Icon icon="undo-2" className="mr-1 h-3.5 w-3.5" />
          Remove selected
        </Button>
      </div>
    </div>
  );
}
