import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import type { ItemNote } from "@/lib/managerThreads";

/** Small "👏 from Sarah" chips under a timeline item. Counselors-only notes show a lock. */
function ItemNoteChips({ notes, viewer }: { notes: ItemNote[]; viewer: "manager" | "counselor" }) {
  if (notes.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {notes.slice(0, 6).map((n) => {
        const isReaction = n.comment_type === "reaction";
        const who = viewer === "manager" && n.mine ? "you" : n.manager_name;
        const text = isReaction ? `${n.content.split(" ")[0]} from ${who}` : `💬 ${who}: ${n.content}`;
        return (
          <span
            key={n.id}
            title={`${n.content}${n.visibility === "counselor" ? " (counselors only)" : ""}`}
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
              n.visibility === "counselor" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"
            }`}
          >
            {n.visibility === "counselor" && <Icon icon="lock" className="h-2.5 w-2.5 shrink-0" />}
            <span className="truncate">{text}</span>
          </span>
        );
      })}
      {notes.length > 6 && <span className="text-[10px] text-muted-foreground">+{notes.length - 6} more</span>}
    </div>
  );
}

export default memo(ItemNoteChips);
