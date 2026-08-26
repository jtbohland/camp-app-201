import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import type { IconName } from "lucide-react/dynamic";

export default function GraduationPage() {
  const user = useSuperblocksUser();

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;

  const { data, loading } = useApiData("GetGraduationSummary", {
    camper_id: camperId,
  }, { enabled: camperId > 0 });

  if (loadingCamper || loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data || !data.camper_name) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <Icon icon="graduation-cap" className="w-12 h-12 mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground mt-3">Your graduation summary will appear here at the end of the program.</p>
      </div>
    );
  }

  const stats: { icon: IconName; label: string; value: string | number; color: string }[] = [
    { icon: "star", label: "Total Points", value: data.total_points, color: "text-amber-400" },
    { icon: "trophy", label: "Rank", value: `#${data.rank} of ${data.total_campers}`, color: "text-yellow-400" },
    { icon: "award", label: "Badges", value: data.badges_earned, color: "text-green-400" },
    { icon: "check-circle", label: "Check-ins", value: data.checkins_count, color: "text-blue-400" },
    { icon: "clipboard-check", label: "Surveys", value: data.surveys_completed, color: "text-purple-400" },
    { icon: "book-open", label: "Prework Done", value: data.prework_completed, color: "text-cyan-400" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Hero */}
      <Card className="p-8 text-center bg-gradient-to-br from-amber-900/20 to-green-900/20 border-amber-700/30">
        <Icon icon="graduation-cap" className="w-12 h-12 mx-auto text-amber-400" />
        <h1 className="text-2xl font-bold mt-3">
          Congratulations, {data.camper_name.split(" ")[0]}! 🎓
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          cAMP 201 Graduate{data.team_name ? ` • ${data.team_name}` : ""}
        </p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{data.total_points}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">#{data.rank}</p>
            <p className="text-xs text-muted-foreground">Rank</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{data.badges_earned}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <Icon icon={stat.icon} className={`w-6 h-6 mx-auto ${stat.color}`} />
            <p className="text-lg font-bold mt-1.5">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Top moments */}
      {data.points_log_highlights.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon icon="sparkles" className="w-4 h-4 text-amber-400" />
            Top Moments
          </h2>
          <div className="space-y-2">
            {data.points_log_highlights.slice(0, 8).map((h, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-foreground">{h.reason}</span>
                <span className="text-xs font-bold text-amber-400">+{h.points}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
