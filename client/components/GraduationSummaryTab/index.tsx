import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import type { IconName } from "lucide-react/dynamic";

export default function GraduationSummaryTab() {
  const user = useSuperblocksUser();

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;
  const isAdmin = ["counselor", "admin"].includes(camperData?.camper?.role ?? "");

  const { data, loading } = useApiData("GetGraduationSummary", {
    camper_id: camperId,
  }, { enabled: camperId > 0 });

  // Check if graduation is unlocked (scores revealed)
  const { data: gateData } = useApiData("GetFeatureGates", {});
  const gates = (gateData?.gates ?? []) as any[];
  const gradGate = gates.find((g: any) => g.feature_key === "graduation");
  const isLocked = gradGate ? gradGate.is_locked : true;

  if (loadingCamper || loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Locked state — show anticipation screen (admins bypass)
  if (isLocked && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center mx-auto">
            <Icon icon="lock" className="w-10 h-10 text-amber-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-camp-green rounded-full flex items-center justify-center">
            <Icon icon="sparkles" className="w-4 h-4 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Something Special is Coming...</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-4">
          Your graduation celebration will unlock after the final EBR presentations.
          Scores, final leaderboard, cAMP Champs, and your complete journey await!
        </p>
        <div className="flex items-center justify-center gap-6 mt-6">
          {["Final Scores", "Leaderboard", "cAMP Champs", "Your Journey"].map((item) => (
            <div key={item} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon icon="lock" className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.camper_name) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <Icon icon="graduation-cap" className="w-12 h-12 mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground mt-3">Your graduation summary will appear here at the end of the program.</p>
      </div>
    );
  }

  const stats: { icon: IconName; label: string; value: string | number; color: string }[] = [
    { icon: "star", label: "Total Points", value: data.total_points, color: "text-amber-500" },
    { icon: "trophy", label: "Final Rank", value: `#${data.rank} of ${data.total_campers}`, color: "text-yellow-500" },
    { icon: "award", label: "Badges", value: data.badges_earned, color: "text-green-500" },
    { icon: "check-circle", label: "Check-ins", value: data.checkins_count, color: "text-blue-500" },
    { icon: "clipboard-check", label: "Surveys", value: data.surveys_completed, color: "text-purple-500" },
    { icon: "book-open", label: "Pre-work", value: data.prework_completed, color: "text-cyan-500" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Confetti Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-green-50 border-2 border-amber-200 p-8 text-center">
        {/* Decorative confetti dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            "top-2 left-6 bg-amber-400", "top-8 right-10 bg-green-400", "bottom-4 left-12 bg-purple-400",
            "top-3 right-20 bg-pink-400", "bottom-8 right-6 bg-blue-400", "top-12 left-[30%] bg-yellow-400",
            "bottom-3 left-[60%] bg-red-400", "top-5 left-[50%] bg-indigo-400",
          ].map((cls, i) => (
            <div key={i} className={`absolute w-2 h-2 rounded-full opacity-60 ${cls}`} />
          ))}
        </div>

        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon icon="graduation-cap" className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">
            Congratulations, {data.camper_name.split(" ")[0]}!
          </h2>
          <p className="text-sm text-gray-600 font-medium">
            cAMP 201 Graduate{data.team_name ? ` \u2022 ${data.team_name}` : ""}
          </p>

          {/* Big stats trio */}
          <div className="flex items-center justify-center gap-10 mt-6">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-amber-600">{data.total_points}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Points</p>
            </div>
            <div className="w-px h-10 bg-amber-200" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-green-600">#{data.rank}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Rank</p>
            </div>
            <div className="w-px h-10 bg-amber-200" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-purple-600">{data.badges_earned}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Badges</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 text-center hover:shadow-md transition-shadow">
            <Icon icon={stat.icon} className={`w-6 h-6 mx-auto ${stat.color}`} />
            <p className="text-xl font-bold mt-2">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Your Team */}
      {data.team_name && (
        <Card className="p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Icon icon="flag" className="w-5 h-5 text-camp-green" />
            <h2 className="text-sm font-semibold text-foreground">Your Team</h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            {data.team_logo ? (
              <img src={data.team_logo} alt={data.team_name} className="w-14 h-14 rounded-xl object-cover border-2" style={{ borderColor: data.team_color || "#ccc" }} />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: data.team_color || "#4a7c59" }}>
                {data.team_name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-foreground">{data.team_name}</h3>
              {data.team_rank && (
                <p className="text-sm text-muted-foreground">
                  Finished <span className="font-bold text-amber-600">#{data.team_rank}</span> of {data.total_teams} teams in the cAMP Champs race
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.team_members.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: data.team_color || "#4a7c59" }}>
                  {m.name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.points} pts</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top moments */}
      {data.points_log_highlights.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon icon="sparkles" className="w-4 h-4 text-amber-400" />
            Your Top Moments
          </h2>
          <div className="space-y-2">
            {data.points_log_highlights.slice(0, 10).map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-foreground">{h.reason}</span>
                <span className="text-xs font-bold text-amber-500">+{h.points}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Closing message from counselors */}
      <Card className="p-8 bg-gradient-to-br from-camp-green/10 via-amber-50/50 to-green-50 border-camp-green/20 text-center relative overflow-hidden">
        <div className="absolute top-3 right-4 text-4xl opacity-10">🏕️</div>
        <Icon icon="heart" className="w-8 h-8 mx-auto text-camp-green mb-3" />
        <h2 className="text-xl font-extrabold text-foreground mb-3">
          From Your Counselors
        </h2>
        <div className="max-w-lg mx-auto space-y-3 text-sm text-foreground/80 leading-relaxed">
          <p>
            We are <strong>so proud</strong> of everything you accomplished this week.
            The discovery skills, the value mapping, the Challenger methodology, the
            teamwork, the late-night prep, the laughs — all of it made this cAMP special.
          </p>
          <p>
            You showed up, you pushed yourself, and you grew. That takes courage.
            The skills you built here are what set great sellers apart — and you've
            got them now.
          </p>
          <p className="font-medium text-foreground">
            Go make an impact. We can't wait to see what you do next.
          </p>
          <p className="text-xs text-muted-foreground italic mt-2">
            Travel home safely — and remember, our doors (and DMs) are always open.
          </p>
        </div>
        <div className="mt-5 pt-4 border-t border-camp-green/15">
          <p className="text-camp-green font-extrabold uppercase tracking-widest text-sm">
            Once a cAMPer, always a cAMPer.
          </p>
        </div>
      </Card>
    </div>
  );
}
