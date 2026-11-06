import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import ManagerThreadCard from "@/components/ManagerThreadCard/index.js";
import { refreshThreadViews } from "@/lib/managerThreads";

/** Report card → every manager thread about this cAMPer (both audiences). Counselors can reply. */
export default function ManagerConversationsSection({ camperId }: { camperId: number }) {
  const { data, loading, fetching } = useApiData("GetCamperManagerThreads", { camper_id: camperId });
  const { run: markRead } = useApi("MarkManagerThreadsRead");
  const markedRef = useRef<Set<number>>(new Set());
  const threads = data?.threads ?? [];

  // Opening the report card clears this cAMPer's unread manager messages
  useEffect(() => {
    const ids = threads.filter((t) => t.unread && !markedRef.current.has(t.id)).map((t) => t.id);
    if (ids.length === 0) return;
    ids.forEach((id) => markedRef.current.add(id));
    markRead({ as_role: "counselor", comment_ids: ids })
      .then(() => refreshThreadViews())
      .catch(() => {});
  }, [threads, markRead]);

  if (loading) return <Skeleton className="h-32 rounded-xl" />;

  return (
    <Card className="p-5 print:break-inside-avoid">
      <h3 className="font-semibold flex items-center gap-2 mb-1">
        <Icon icon="messages-square" className="w-4 h-4 text-blue-500" />
        Manager Conversations
        <span className="text-xs font-normal text-muted-foreground">({threads.length})</span>
        {fetching && <span className="ml-auto text-xs font-normal text-muted-foreground">Updating…</span>}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Everything this cAMPer’s manager has sent, including notes for counselors only.
      </p>
      {threads.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No manager messages yet</p>
      ) : (
        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {threads.slice(0, 50).map((t) => (
            <ManagerThreadCard key={t.id} thread={t} viewerRole="counselor" showParticipants />
          ))}
        </div>
      )}
    </Card>
  );
}
