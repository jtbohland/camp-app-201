import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";
import UnregisteredManagers from "@/components/UnregisteredManagers/index.js";
import CamperClaimPool from "@/components/CamperClaimPool/index.js";
import RegisteredManagersTable from "@/components/RegisteredManagersTable/index.js";

type ManagerComment = {
  id: number;
  manager_first_name: string;
  manager_last_name: string;
  camper_first_name: string;
  camper_last_name: string;
  comment_type: string;
  sentiment: string;
  content: string;
  created_at: string;
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  encouraging: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  feedback: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  concerning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function AdminManagerOverview() {
  const { data, loading, fetching } = useApiData("GetAdminManagerOverview", {});

  const managers = useMemo(() => data?.managers ?? [], [data]);
  const comments = useMemo(() => data?.recent_comments ?? [], [data]);
  const expected = useMemo(() => data?.expected_managers ?? [], [data]);
  const hiresWithoutManager = useMemo(() => data?.hires_without_manager ?? [], [data]);
  const pool = useMemo(() => data?.camper_pool ?? [], [data]);
  const claimedCount = useMemo(() => pool.filter((p) => !!p.claimed_by).length, [pool]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 bg-muted" />
        <Skeleton className="h-48 bg-muted" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${fetching ? "opacity-70" : ""}`}>
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="text-3xl font-bold text-foreground">{managers.length}</div>
          <div className="text-sm text-muted-foreground">Registered Managers</div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="text-3xl font-bold text-foreground">
            {claimedCount}
            {pool.length > 0 && <span className="text-lg font-semibold text-muted-foreground"> / {pool.length}</span>}
          </div>
          <div className="text-sm text-muted-foreground">cAMPers Claimed</div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="text-3xl font-bold text-foreground">{comments.length}</div>
          <div className="text-sm text-muted-foreground">Total Comments</div>
        </Card>
      </div>

      {/* Every Accepted cAMPer: unclaimed ones in the pool, claimed ones matched to their manager */}
      <CamperClaimPool pool={pool} />

      {/* Who we're still waiting on */}
      <UnregisteredManagers expected={expected} hiresWithoutManager={hiresWithoutManager} />

      {/* Registered managers table */}
      <RegisteredManagersTable managers={managers} />

      {/* Recent comments feed */}
      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-foreground font-semibold flex items-center gap-2">
            <Icon icon="message-circle" className="w-4 h-4" />
            Recent Manager Comments
          </h3>
        </div>
        {comments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No comments yet</div>
        ) : (
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {comments.map((c: ManagerComment) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground text-sm font-medium">
                    {c.manager_first_name} {c.manager_last_name}
                  </span>
                  <Icon icon="arrow-right" className="w-3 h-3 text-muted-foreground/70" />
                  <span className="text-muted-foreground text-sm">
                    {c.camper_first_name} {c.camper_last_name}
                  </span>
                  <Badge className={`text-[10px] ml-auto ${SENTIMENT_COLORS[c.sentiment] ?? "bg-muted text-muted-foreground"}`}>
                    {c.sentiment}
                  </Badge>
                </div>
                <p className="text-foreground/80 text-sm">{c.content}</p>
                <p className="text-muted-foreground/70 text-[10px] mt-1">
                  {new Date(c.created_at).toLocaleString()} · {c.comment_type}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
