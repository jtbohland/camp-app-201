import { useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";

export type AttentionItem = {
  camper_id: number;
  name: string;
  first_name: string;
  photo_url: string | null;
  missed_recent: number;
  unread_replies: number;
  never_contacted: boolean;
  reasons: string[];
};

/** Manager Portal → which hires need you right now (recent misses, new replies, never contacted). */
export default function ManagerAttentionCard({ items }: { items: AttentionItem[] }) {
  const navigate = useNavigate();
  const flagged = items.filter((i) => i.reasons.length > 0);

  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon icon="bell-ring" className="h-4 w-4 text-amber-500" />
        Needs your attention
        <span className="text-xs font-normal text-muted-foreground">({flagged.length})</span>
      </h3>
      {flagged.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">All caught up. Every cAMPer is on track and you've replied to everything.</p>
      ) : (
        <div className="space-y-2">
          {flagged.slice(0, 20).map((i) => (
            <button
              key={i.camper_id}
              type="button"
              onClick={() => navigate(`/manager/hire/${i.camper_id}`)}
              className="flex w-full items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted/50"
            >
              <CamperAvatar email="" name={i.name} photoUrl={i.photo_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{i.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {i.missed_recent > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">{i.reasons.find((r) => r.includes("missed"))}</span>
                  )}
                  {i.unread_replies > 0 && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{i.reasons.find((r) => r.includes("repl"))}</span>
                  )}
                  {i.never_contacted && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">You haven't sent a note yet</span>
                  )}
                </div>
              </div>
              <Icon icon="chevron-right" className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
