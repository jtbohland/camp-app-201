import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TYPE_LABELS, dayLabel, type ScheduleItem, type Slot } from "@/lib/presentationSchedule";

type Props = {
  item: ScheduleItem;
  /** 1-based position in its day (hidden in the bank). */
  position: number | null;
  numDays: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveTo: (slot: Slot) => void;
  onShift: (delta: -1 | 1) => void;
  onEdit: () => void;
  onToggleLock: () => void;
};

/** One presentation on the board: drag it, or use the menu to move / reorder / remove. */
export default function ScheduleCard({
  item, position, numDays, canMoveUp, canMoveDown, onMoveTo, onShift, onEdit, onToggleLock,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const inBank = item.day_number === null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 rounded-lg border bg-card px-2 py-2 shadow-sm ${
        isDragging ? "opacity-40" : ""
      } ${inBank ? "border-dashed border-border" : "border-border"}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag ${item.title}`}
      >
        <Icon icon="grip-vertical" className="h-4 w-4" />
      </button>

      {position !== null && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
          {position}
        </span>
      )}

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {TYPE_LABELS[item.presentation_type] ?? "Activity"}
          {item.present_time_minutes ? ` · ${item.present_time_minutes}m present` : ""}
        </p>
      </button>

      {!inBank && (
        <button
          type="button"
          onClick={onToggleLock}
          title={item.is_locked ? "Locked for cAMPers. Click to unlock." : "Open for cAMPers. Click to lock."}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
            item.is_locked ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          <Icon icon={item.is_locked ? "lock" : "lock-open"} className="h-3.5 w-3.5" />
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`More options for ${item.title}`}
          >
            <Icon icon="ellipsis-vertical" className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit}>
            <Icon icon="pencil" className="mr-2 h-3.5 w-3.5" /> Edit details
          </DropdownMenuItem>
          {!inBank && (
            <>
              <DropdownMenuItem disabled={!canMoveUp} onClick={() => onShift(-1)}>
                <Icon icon="arrow-up" className="mr-2 h-3.5 w-3.5" /> Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canMoveDown} onClick={() => onShift(1)}>
                <Icon icon="arrow-down" className="mr-2 h-3.5 w-3.5" /> Move down
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] text-muted-foreground">Show on</DropdownMenuLabel>
          {Array.from({ length: numDays }, (_, i) => i + 1).map((d) => (
            <DropdownMenuItem key={d} disabled={item.day_number === d} onClick={() => onMoveTo(d)}>
              <Icon icon="calendar" className="mr-2 h-3.5 w-3.5" /> {dayLabel(d)}
            </DropdownMenuItem>
          ))}
          {!inBank && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onMoveTo("bank")} className="text-red-600 focus:text-red-700">
                <Icon icon="eye-off" className="mr-2 h-3.5 w-3.5" /> Remove from app
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
