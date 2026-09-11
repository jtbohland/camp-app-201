import { useCallback } from "react";
import { useApi } from "@/hooks/useApi";

const EMOJIS = [
  { emoji: "❤️", label: "love" },
  { emoji: "🙌", label: "support" },
  { emoji: "🥹", label: "care" },
  { emoji: "😂", label: "joy" },
  { emoji: "🔥", label: "fire" },
];

type Reaction = { emoji: string; count: number; reacted: boolean };

export default function ReactionBar({
  memoryId,
  camperId,
  reactions,
  onReacted,
}: {
  memoryId: number;
  camperId: number;
  reactions: Reaction[];
  onReacted: () => void;
}) {
  const { run: toggleReaction } = useApi("ToggleMemoryReaction");

  const handleToggle = useCallback(
    async (emoji: string) => {
      try {
        await toggleReaction({ memory_id: memoryId, camper_id: camperId, emoji });
        onReacted();
      } catch {}
    },
    [memoryId, camperId, toggleReaction, onReacted]
  );

  return (
    <div className="flex items-center gap-1 mt-2">
      {EMOJIS.map(({ emoji }) => {
        const rx = reactions.find((r) => r.emoji === emoji);
        const count = rx?.count ?? 0;
        const reacted = rx?.reacted ?? false;
        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
              reacted
                ? "bg-amber-500/20 border border-amber-500/40"
                : "bg-muted/30 border border-transparent hover:bg-muted/50"
            }`}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && (
              <span className={`text-[10px] font-medium ${reacted ? "text-amber-400" : "text-muted-foreground"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
