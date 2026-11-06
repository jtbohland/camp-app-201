import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import ManagerThreadCard from "@/components/ManagerThreadCard/index.js";
import { errorMessage } from "@/lib/cohortRefresh";
import { refreshThreadViews } from "@/lib/managerThreads";

const PAGE = 5;

/**
 * cAMPer Profile → notes their manager shared with them. cAMPers can reply or tap "Got it",
 * but never start a conversation. Counselors-only notes are never returned by the API.
 */
export default function FromYourManagerCard() {
  const { data, loading, fetching } = useApiData("GetMyManagerThreads", {}, { refetchInterval: 60_000 });
  const { run: acknowledge, loading: acking } = useApi("AcknowledgeManagerThread");
  const { run: markRead } = useApi("MarkManagerThreadsRead");
  const [shown, setShown] = useState(PAGE);
  const markedRef = useRef<Set<number>>(new Set());

  const threads = data?.threads ?? [];
  const unread = data?.unread_count ?? 0;

  // Seeing the card marks notes read (after a moment so the "new" highlight registers)
  useEffect(() => {
    const ids = threads.filter((t) => t.unread && !markedRef.current.has(t.id)).map((t) => t.id);
    if (ids.length === 0) return;
    const timer = setTimeout(() => {
      ids.forEach((id) => markedRef.current.add(id));
      markRead({ as_role: "camper", comment_ids: ids })
        .then(() => refreshThreadViews())
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, [threads, markRead]);

  const handleAck = useCallback(async (id: number) => {
    try {
      await acknowledge({ comment_id: id });
      await refreshThreadViews();
    } catch (error) {
      toast.error("Couldn't send: " + errorMessage(error));
    }
  }, [acknowledge]);

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (threads.length === 0) return null;

  return (
    <Card id="from-your-manager" className="p-6 border-blue-200">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon icon="binoculars" className="w-5 h-5 text-blue-500" />
          From your manager
          {unread > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{unread} new</span>
          )}
        </h2>
        {fetching && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Notes and cheers from your manager. Reply or tap “Got it” to let them know you saw it.
      </p>

      <div className="space-y-3">
        {threads.slice(0, shown).map((t) => (
          <ManagerThreadCard
            key={t.id}
            thread={t}
            viewerRole="camper"
            actions={
              !t.acknowledged_at ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={acking} onClick={() => handleAck(t.id)}>
                  <Icon icon="thumbs-up" className="w-3.5 h-3.5 mr-1" /> Got it
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>

      {threads.length > shown && (
        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setShown((n) => n + PAGE)}>
          Show older notes ({threads.length - shown} more)
        </Button>
      )}
    </Card>
  );
}
