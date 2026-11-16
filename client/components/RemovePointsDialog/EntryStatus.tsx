import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Props = {
  points: number;
  category: string | null;
  reversed: boolean;
  isReversal: boolean;
  onRemove?: () => void;
};

/** "Removed" tag, or the Remove button when a counselor can still reverse this entry. */
export default function EntryStatus({ points, category, reversed, isReversal, onRemove }: Props) {
  if (reversed) {
    return (
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Removed</span>
    );
  }
  if (isReversal) {
    return (
      <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">Correction</span>
    );
  }
  if (!onRemove || points === 0 || category === "team_award") return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive print:hidden"
      onClick={onRemove}
      title={points < 0 ? "Give these points back" : "Remove these points"}
    >
      <Icon icon="undo-2" className="mr-1 h-3 w-3" />
      {points < 0 ? "Undo" : "Remove"}
    </Button>
  );
}
