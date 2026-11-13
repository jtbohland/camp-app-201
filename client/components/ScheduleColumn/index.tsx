import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Icon } from "@/components/ui/icon";
import type { Slot } from "@/lib/presentationSchedule";

type Props = {
  slot: Slot;
  title: string;
  subtitle?: string;
  itemIds: number[];
  /** Extra header controls (e.g. a "New" button on the bank). */
  action?: ReactNode;
  emptyText: string;
  variant?: "day" | "bank";
  children: ReactNode;
};

export const slotDroppableId = (slot: Slot) => `slot-${slot}`;

/** A day column (or the bank) that cards can be dropped into and reordered within. */
export default function ScheduleColumn({
  slot, title, subtitle, itemIds, action, emptyText, variant = "day", children,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: slotDroppableId(slot), data: { slot } });
  const isBank = variant === "bank";

  return (
    <div
      className={`flex min-w-0 flex-col rounded-xl border ${
        isBank ? "border-dashed border-border bg-muted/30" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Icon icon={isBank ? "archive" : "calendar"} className="h-3.5 w-3.5 text-muted-foreground" />
            {title}
            <span className="text-xs font-normal text-muted-foreground">({itemIds.length})</span>
          </p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 p-2 transition-colors ${isOver ? "bg-primary/5" : ""}`}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        {itemIds.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}
