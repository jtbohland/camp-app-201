import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useMemo } from "react";
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

  // Feature gate
  const { data: gateData } = useApiData("GetFeatureGates", {});
  const gates = (gateData?.gates ?? []) as any[];
  const gradGate = gates.find((g: any) => g.feature_key === "graduation");
  const isLocked = gradGate ? gradGate.is_locked : true;

  // Awards data
  const { data: wdData } = useApiData("GetWheelLeaderboard", {}, { enabled: camperId > 0, staleTime: 30_000 });
  const wdLeaders = (wdData?.leaders ?? []) as any[];
  const topDealerId = wdLeaders[0]?.camper_id ?? null;
  const myWdStats = wdLeaders.find((l: any) => l.camper_id === camperId);

  const { data: spiritData } = useApiData("GetSpiritVoteResults", { camper_id: camperId }, { enabled: camperId > 0, staleTime: 30_000 });
  const spiritVotesReceived = spiritData?.my_votes_received?.vote_count ?? 0;
  const spiritNotes = (spiritData?.my_votes_received?.notes ?? []) as { note: string | null }[];
  const spiritWinners = spiritData?.winners ?? [];
  const isSpiritWinner = (() => {
    if (!spiritData?.voting_complete || spiritWinners.length === 0) return false;
    const topVotes = (spiritWinners as any[])[0].vote_count;
    const tied = (spiritWinners as any[]).filter((w: any) => w.vote_count === topVotes);
    if (tied.length === 1) return tied[0].camper_id === camperId;
    const maxNotes = Math.max(...tied.map((w: any) => w.note_count));
    return tied.filter((w: any) => w.note_count === maxNotes).some((w: any) => w.camper_id === camperId);
  })();

  // Badges — use count from graduation data (individual list not available)
  const badgeCount = data?.badges_earned ?? 0;

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

  // Locked state
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
          Your graduation celebration will unlock after the final presentations.
          Scores, awards, cAMP Champs, and your complete journey await!
        </p>
        <div className="flex items-center justify-center gap-6 mt-6">
          {["Final Scores", "Awards", "cAMP Champs", "Your Journey"].map((item) => (
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

  // Compute awards this camper holds
  const isCampVP = data.rank === 1 && data.total_points > 0;
  const isTopDealer = camperId === topDealerId;
  const hasInnovation = false; // TODO: check from badge list when available

  const awards: { emoji: string; title: string; subtitle: string; gradient: string }[] = [];
  if (isCampVP) awards.push({ emoji: "👑", title: "cAMP-V-P", subtitle: "Most Valuable cAMPer — #1 in total XP", gradient: "from-yellow-400 to-amber-500" });
  if (isTopDealer) awards.push({ emoji: "🎡", title: "Top Dealer", subtitle: `${myWdStats?.pitch_count ?? 0} pitches · ${myWdStats?.total_points ?? 0} W&D pts`, gradient: "from-blue-500 to-indigo-500" });
  if (isSpiritWinner) awards.push({ emoji: "✨", title: "Camp Spirit", subtitle: `Voted by your peers — ${spiritVotesReceived} vote${spiritVotesReceived !== 1 ? "s" : ""}`, gradient: "from-emerald-400 to-teal-500" });
  if (hasInnovation) awards.push({ emoji: "🏆", title: "Innovation Award", subtitle: "AI Hackathon winning team", gradient: "from-amber-500 to-orange-500" });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Confetti Banner ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-green-50 border-2 border-amber-200 p-8 text-center">
        <CampConfetti />
        <div className="relative">
          <img src="/nomnom/camp201-logo.png" alt="cAMP 201" className="w-20 h-20 mx-auto mb-3 rounded-full shadow-lg object-cover" />
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">
            Congratulations, {data.camper_name.split(" ")[0]}!
          </h2>
          <p className="text-sm text-gray-600 font-medium">
            cAMP 201 Graduate{data.team_name ? ` • ${data.team_name}` : ""}
          </p>
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
              <p className="text-3xl font-extrabold text-purple-600">{badgeCount}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Badges</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Awards & Titles ────────────────────────────── */}
      {awards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Icon icon="crown" className="w-4 h-4 text-amber-400" />
            Your Awards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {awards.map((a) => (
              <Card key={a.title} className={`p-4 bg-gradient-to-r ${a.gradient} text-white overflow-hidden relative`}>
                <div className="absolute top-2 right-3 text-4xl opacity-20">{a.emoji}</div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{a.emoji}</span>
                    <h3 className="font-extrabold text-lg">{a.title}</h3>
                  </div>
                  <p className="text-xs text-white/80">{a.subtitle}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Badge Showcase ─────────────────────────────── */}
      {badgeCount > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon icon="award" className="w-4 h-4 text-green-500" />
            Badges Earned
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center">
              <Icon icon="award" className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground">{badgeCount} badge{badgeCount !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Collected throughout your cAMP journey</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Wheel & Deal Recap ─────────────────────────── */}
      {myWdStats && myWdStats.pitch_count > 0 && (
        <Card className="p-5 border-blue-200 bg-blue-50/30">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-base">🎡</span> Your Wheel & Deal Recap
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white shadow-sm">
              <div className="text-2xl font-extrabold text-blue-600">{myWdStats.pitch_count}</div>
              <div className="text-[10px] text-muted-foreground font-medium">Pitches</div>
            </div>
            <div className="p-3 rounded-xl bg-white shadow-sm">
              <div className="text-2xl font-extrabold text-blue-600">{myWdStats.avg_self_score || "—"}</div>
              <div className="text-[10px] text-muted-foreground font-medium">Self Avg</div>
            </div>
            <div className="p-3 rounded-xl bg-white shadow-sm">
              <div className="text-2xl font-extrabold text-purple-600">{myWdStats.avg_room_score || "—"}</div>
              <div className="text-[10px] text-muted-foreground font-medium">Room Avg</div>
            </div>
            <div className="p-3 rounded-xl bg-white shadow-sm">
              <div className="text-2xl font-extrabold text-amber-600">{myWdStats.total_points}</div>
              <div className="text-[10px] text-muted-foreground font-medium">W&D Pts</div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Camp Spirit: Kind Words From Peers ──────────── */}
      {spiritVotesReceived > 0 && (
        <Card className="p-5 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/30">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <span className="text-base">🏕️</span> Kind Words From Your cAMPeers
          </h2>
          <p className="text-[10px] text-muted-foreground mb-3">
            {spiritVotesReceived} cAMPer{spiritVotesReceived !== 1 ? "s" : ""} recognized you for Camp Spirit
          </p>
          {spiritNotes.filter((n) => n.note).length > 0 ? (
            <div className="space-y-2">
              {spiritNotes.filter((n) => n.note).map((n, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-emerald-400 mt-0.5">💬</span>
                  <p className="text-sm text-foreground/80 italic">"{n.note}"</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Your peers voted for you — no additional notes were left.</p>
          )}
        </Card>
      )}

      {/* ── Your Team ──────────────────────────────────── */}
      {data.team_name ? (
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
      ) : isAdmin ? (
        <Card className="p-6 border-dashed border-2 border-amber-300 bg-amber-50/30">
          <div className="flex items-center gap-2 mb-4">
            <Icon icon="flag" className="w-5 h-5 text-camp-green" />
            <h2 className="text-sm font-semibold text-foreground">Your Team</h2>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Admin Preview</span>
          </div>
          <p className="text-xs text-amber-600 italic text-center">
            This section shows each camper's team, logo, members, and final placement.
          </p>
        </Card>
      ) : null}

      {/* ── Your cAMP Journey (stats) ──────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Icon icon="map" className="w-4 h-4 text-blue-500" />
          Your cAMP Journey
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { icon: "check-circle" as IconName, label: "Check-ins", value: data.checkins_count, color: "text-blue-500" },
            { icon: "clipboard-check" as IconName, label: "Surveys", value: data.surveys_completed, color: "text-purple-500" },
            { icon: "book-open" as IconName, label: "Pre-work", value: data.prework_completed, color: "text-cyan-500" },
            { icon: "message-circle" as IconName, label: "Feedback Given", value: (data as any).feedback_count ?? 0, color: "text-orange-500" },
          ]).map((stat) => (
            <Card key={stat.label} className="p-4 text-center hover:shadow-md transition-shadow">
              <Icon icon={stat.icon} className={`w-5 h-5 mx-auto ${stat.color}`} />
              <p className="text-xl font-bold mt-2">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Top Moments ────────────────────────────────── */}
      {data.points_log_highlights.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon icon="sparkles" className="w-4 h-4 text-amber-400" />
            Your Top Moments
          </h2>
          <div className="space-y-2">
            {data.points_log_highlights.slice(0, 12).map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-foreground">{h.reason}</span>
                <span className="text-xs font-bold text-amber-500">+{h.points}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Counselor Closing Message ──────────────────── */}
      <Card className="p-8 bg-gradient-to-br from-[#1e1b4b]/5 via-indigo-50/50 to-purple-50 border-indigo-200/30 text-center relative overflow-hidden">
        <img src="/nomnom/campfire.png" alt="" className="absolute -bottom-6 -right-2 w-44 h-44 object-contain opacity-[0.08] pointer-events-none" />
        <Icon icon="heart" className="w-8 h-8 mx-auto text-indigo-500 mb-3" />
        <h2 className="text-xl font-extrabold text-foreground mb-3">From Your Counselors</h2>
        <div className="max-w-lg mx-auto space-y-3 text-sm text-foreground/80 leading-relaxed">
          <p>
            Thank you for leaning in and bringing so much positive energy, creativity, and good spirit
            to this week. Your discovery skills, value mapping, Challenger practice, teamwork, daily
            contributions, and laughs all made this cAMP special.
          </p>
          <p>
            We appreciate how driven and determined you were — balancing cAMP with meetings, day jobs,
            travel, and everything else on your plates while still showing up motivated and ready to grow.
          </p>
          <p>
            You showed up, pushed yourselves, and grew. The confidence and skills you built here are what
            set great sellers apart — and you have them now.
          </p>
          <p className="font-medium text-foreground">
            Go make an impact. We are proud of you and cannot wait to see what you do next.
          </p>
          <p className="text-xs text-muted-foreground italic mt-2">
            Travel home safely — and remember, our doors and DMs are always open.
          </p>
        </div>
        <div className="mt-5 pt-4 border-t border-indigo-200/30">
          <p className="text-indigo-600 font-extrabold uppercase tracking-widest text-sm">
            Keep Climbing!
          </p>
        </div>
      </Card>
    </div>
  );
}

/* Animated camping confetti */
const CONFETTI_EMOJIS = ["⭐", "⛺", "🌲", "🔥", "🏆", "🌟", "🏕️", "🌿"];

function CampConfetti() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
      left: `${(i * 37 + 11) % 100}%`,
      delay: `${(i * 0.7) % 5}s`,
      duration: `${4 + (i % 4) * 1.2}s`,
      size: 12 + (i % 3) * 4,
    })), []
  );

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.5; }
          100% { transform: translateY(250px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: p.left,
              top: -20,
              fontSize: p.size,
              animation: `confettiFall ${p.duration} ${p.delay} infinite ease-in`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </>
  );
}
