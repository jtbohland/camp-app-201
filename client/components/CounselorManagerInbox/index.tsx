import { useCallback } from "react";
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

type Props = {
  /** Open a cAMPer's report card */
  onCamperClick: (camperId: number) => void;
};

/** Hub Dashboard → Manager Messages: newest manager notes for the cohort, unread first. */
export default function CounselorManagerInbox({ onCamperClick }: Props) {
  const { data, loading, fetching } = useApiData("GetCounselorManagerInbox", { limit: 8 }, { refetchInterval: 60_000 });
  const { run: markRead, loading: marking } = useApi("MarkManagerThreadsRead");

  const threads = data?.threads ?? [];
  const unread = data?.unread_count ?? 0;

  const handleMarkAll = useCallback(async () => {
    const ids = threads.filter((t) => t.unread).map((t) => t.id);
    if (ids.length === 0) return;
    try {
      await markRead({ as_role: "counselor", comment_ids: ids });
      await refreshThreadViews();
    } catch (error) {
      toast.error("Couldn't update: " + errorMessage(error));
    }
  }, [threads, markRead]);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon icon="binoculars" className="w-4 h-4 text-blue-500" />
          Manager Messages
          {unread > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{unread} new</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {fetching && <span className="text-xs text-muted-foreground">Updating…</span>}
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={marking} onClick={handleMarkAll}>
              <Icon icon="check-check" className="w-3.5 h-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        “Counselors only” notes alert you here. Notes shared with cAMPers are listed too, so you can follow along.
      </p>

      {threads.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No manager messages yet</p>
      ) : (
        <div className={`space-y-2 ${fetching ? "opacity-70" : ""}`}>
          {threads.map((t) => (
            <div key={t.id} className="space-y-1">
              <ManagerThreadCard thread={t} viewerRole="counselor" showParticipants />
              <button
                type="button"
                onClick={() => onCamperClick(t.camper_id)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pl-1"
              >
                Open {t.camper_name.split(" ")[0]}’s report card <Icon icon="arrow-right" className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
