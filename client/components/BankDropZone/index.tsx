import { useDroppable } from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";

/**
 * Shown while a scheduled card is being dragged. Floats over the bottom of the screen
 * (so it doesn't shift the board) and lets a counselor drop the card into the bank
 * without scrolling down to it.
 */
export default function BankDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "bank-dropzone", data: { slot: "bank" } });

  return (
    <div
      ref={setNodeRef}
      className={`fixed bottom-6 left-1/2 z-50 flex w-[min(28rem,90vw)] -translate-x-1/2 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm font-medium shadow-lg transition-colors ${
        isOver
          ? "border-red-400 bg-red-50 text-red-700"
          : "border-border bg-card/95 text-muted-foreground backdrop-blur"
      }`}
    >
      <Icon icon="archive" className="h-4 w-4" />
      {isOver ? "Release to move to the bank (hidden from cAMPers)" : "Drop here to move to the bank"}
    </div>
  );
}
