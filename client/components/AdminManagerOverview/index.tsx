import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";

type ManagerOverview = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  region: string;
  hire_count: number;
  comment_count: number;
  last_viewed_at: string | null;
  created_at: string;
};

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
            {managers.reduce((sum: number, m: ManagerOverview) => sum + m.hire_count, 0)}
          </div>
          <div className="text-sm text-muted-foreground">Hires Claimed</div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="text-3xl font-bold text-foreground">{comments.length}</div>
          <div className="text-sm text-muted-foreground">Total Comments</div>
        </Card>
      </div>

      {/* Manager list */}
      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-foreground font-semibold flex items-center gap-2">
            <Icon icon="binoculars" className="w-4 h-4" />
            Registered Managers
          </h3>
        </div>
        {managers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No managers have registered yet</div>
        ) : (
          <div className="divide-y divide-border">
            {managers.map((m: ManagerOverview) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {m.first_name[0]}{m.last_name[0]}
                  </div>
                  <div>
                    <div className="text-foreground font-medium text-sm">
                      {m.first_name} {m.last_name}
                    </div>
                    <div className="text-muted-foreground text-xs">{m.title} · {m.region || "No region"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-muted text-foreground/80 border-border text-xs">
                    {m.hire_count} hire{m.hire_count !== 1 ? "s" : ""}
                  </Badge>
                  {m.comment_count > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                      {m.comment_count} comment{m.comment_count !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {m.last_viewed_at ? (
                    <span className="text-[10px] text-green-400 flex items-center gap-1">
                      <Icon icon="eye" className="w-3 h-3" />
                      Viewed {new Date(m.last_viewed_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70">Never viewed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
