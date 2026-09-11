import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import ReactionBar from "@/components/ReactionBar";

type Memory = {
  id: number;
  camper_id: number;
  memory_type: string;
  content: string | null;
  image_url: string | null;
  day_number: number | null;
  created_at: string;
  author_name: string;
  author_photo: string | null;
  reactions: { emoji: string; count: number; reacted: boolean }[];
};

export default function MemoryCard({
  memory,
  camperId,
  onReacted,
}: {
  memory: Memory;
  camperId: number;
  onReacted: () => void;
}) {
  const timeAgo = getTimeAgo(memory.created_at);

  return (
    <Card className="p-4 bg-card border">
      {/* Author header */}
      <div className="flex items-center gap-2.5 mb-3">
        {memory.author_photo ? (
          <img src={memory.author_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-700/30 flex items-center justify-center">
            <Icon icon="user" className="w-4 h-4 text-emerald-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{memory.author_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {timeAgo}
            {memory.day_number != null && ` • Day ${memory.day_number}`}
          </p>
        </div>
        {memory.memory_type === "photo" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
            📸 Photo
          </span>
        )}
        {memory.memory_type === "text" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
            ✍️ Memory
          </span>
        )}
      </div>

      {/* Content */}
      {memory.memory_type === "photo" && memory.image_url && (
        <div className="rounded-lg overflow-hidden mb-2">
          <img
            src={memory.image_url}
            alt={memory.content ?? "Camp photo"}
            className="w-full max-h-80 object-cover"
            loading="lazy"
          />
        </div>
      )}
      {memory.content && (
        <p className={`text-sm text-foreground ${memory.memory_type === "text" ? "text-base leading-relaxed" : "text-xs text-muted-foreground"}`}>
          {memory.content}
        </p>
      )}

      {/* Reactions */}
      <ReactionBar
        memoryId={memory.id}
        camperId={camperId}
        reactions={memory.reactions}
        onReacted={onReacted}
      />
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
