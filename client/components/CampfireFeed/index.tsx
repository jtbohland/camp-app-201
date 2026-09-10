import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const REACTION_EMOJIS = ["👍", "☀️", "❤️", "🏆", "🔥", "👏🏻", "⚡", "🏔️", "🚀", "🦋", "🦅"];

type FeedbackItem = {
  id: number;
  session_label: string;
  team_name: string | null;
  author_name: string;
  category: string;
  content: string;
  created_at: string;
};

/**
 * Live Campfire Feed — shows all peer feedback in real-time
 * with emoji reactions. Refreshes every 15 seconds.
 */
export default function CampfireFeed({ camperId }: { camperId: number }) {
  const [filter, setFilter] = useState<string | null>(null);

  const { data, loading, fetching } = useApiData("GetPeerFeedback", {
    session_label: filter,
    team_id: null,
  }, { refetchInterval: 15_000 });

  const feedback = (data?.feedback ?? []) as FeedbackItem[];
  const sessions = (data?.sessions ?? []) as string[];

  // Filter out reaction rows — only show glow/grow/trail_notes
  const feedItems = feedback.filter((f) => ["sunshine", "rain", "trail_notes"].includes(f.category));

  // Group by author+session+team (one "card" per submission)
  const grouped = groupFeedback(feedItems);

  // Reactions stored locally (in a real app these would be persisted)
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, Set<string>>>({});

  const handleReaction = useCallback((groupKey: string, emoji: string) => {
    setMyReactions((prev) => {
      const current = prev[groupKey] ?? new Set();
      const next = new Set(current);
      if (next.has(emoji)) {
        next.delete(emoji);
      } else {
        next.add(emoji);
      }
      return { ...prev, [groupKey]: next };
    });
    setReactions((prev) => {
      const current = prev[groupKey] ?? {};
      const count = current[emoji] ?? 0;
      const mySet = myReactions[groupKey] ?? new Set();
      const delta = mySet.has(emoji) ? -1 : 1;
      return { ...prev, [groupKey]: { ...current, [emoji]: Math.max(0, count + delta) } };
    });
  }, [myReactions]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground bg-muted/20">
        <span className="text-2xl block mb-2">🏕️</span>
        <p className="text-sm">No campfire reviews yet. Be the first to share feedback!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-2">
          🏕️ cAMPfire Feed
          {fetching && <span className="text-xs font-normal text-muted-foreground animate-pulse">updating…</span>}
        </h3>
        {sessions.length > 1 && (
          <select
            value={filter ?? ""}
            onChange={(e) => setFilter(e.target.value || null)}
            className="text-xs rounded-lg border border-border bg-background px-2 py-1"
          >
            <option value="">All Presentations</option>
            {sessions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Feed cards */}
      <div className="space-y-3">
        {grouped.map((group) => {
          const groupKey = `${group.authorName}-${group.sessionLabel}-${group.teamName}`;
          const groupReactions = reactions[groupKey] ?? {};
          const mySet = myReactions[groupKey] ?? new Set();

          return (
            <Card key={groupKey} className="p-4 hover:shadow-sm transition-shadow">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-camp-green/15 flex items-center justify-center text-xs font-bold text-camp-green">
                    {group.authorName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{group.authorName}</span>
                    <span className="text-xs text-muted-foreground ml-2">→ {group.teamName}</span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {group.sessionLabel} · {new Date(group.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Glow items */}
              {group.glowItems.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">☀️ Glow</p>
                  {group.glowItems.map((item, i) => (
                    <p key={i} className="text-sm text-foreground pl-4 py-0.5">• {item}</p>
                  ))}
                </div>
              )}

              {/* Grow items */}
              {group.growItems.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">🌱 Grow</p>
                  {group.growItems.map((item, i) => (
                    <p key={i} className="text-sm text-foreground pl-4 py-0.5">• {item}</p>
                  ))}
                </div>
              )}

              {/* Trail Notes */}
              {group.trailNotes && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">📝 Trail Notes</p>
                  <p className="text-sm text-foreground pl-4">{group.trailNotes}</p>
                </div>
              )}

              {/* Emoji Reactions */}
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                {REACTION_EMOJIS.map((emoji) => {
                  const count = groupReactions[emoji] ?? 0;
                  const isActive = mySet.has(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(groupKey, emoji)}
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-colors ${
                        isActive
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/50 border border-transparent hover:bg-muted"
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-[10px] font-medium">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Group individual feedback rows into submission cards */
function groupFeedback(items: FeedbackItem[]) {
  const map = new Map<string, {
    authorName: string;
    teamName: string;
    sessionLabel: string;
    createdAt: string;
    glowItems: string[];
    growItems: string[];
    trailNotes: string | null;
  }>();

  for (const item of items) {
    const key = `${item.author_name}-${item.session_label}-${item.team_name}`;
    if (!map.has(key)) {
      map.set(key, {
        authorName: item.author_name,
        teamName: item.team_name ?? "Unknown",
        sessionLabel: item.session_label,
        createdAt: item.created_at,
        glowItems: [],
        growItems: [],
        trailNotes: null,
      });
    }
    const group = map.get(key)!;
    if (item.category === "sunshine") group.glowItems.push(item.content);
    else if (item.category === "rain") group.growItems.push(item.content);
    else if (item.category === "trail_notes") group.trailNotes = item.content;
  }

  return Array.from(map.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
