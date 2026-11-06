import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";
import ManagerAttentionCard from "@/components/ManagerAttentionCard/index.js";
import ManagerTodayFeed from "@/components/ManagerTodayFeed/index.js";

/** Manager Portal → Overview: who needs attention + recent activity across every hire. */
export default function ManagerOverview({ canReact }: { canReact: boolean }) {
  const [days, setDays] = useState<1 | 3 | 7>(3);
  const { data, loading, fetching, isError, refetch } = useApiData("GetManagerTodayFeed", { days }, { refetchInterval: 120_000 });

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-destructive">Couldn't load your overview.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
      </Card>
    );
  }
  if (!data || data.hire_count === 0) return null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.4fr]">
      <ManagerAttentionCard items={data.attention} />
      <ManagerTodayFeed
        feed={data.feed}
        itemNotes={data.item_notes}
        days={days}
        onDaysChange={setDays}
        fetching={fetching}
        canReact={canReact}
      />
    </div>
  );
}
