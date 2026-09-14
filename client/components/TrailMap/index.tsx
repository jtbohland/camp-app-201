import { useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import DailyTrail from "./DailyTrail.js";
import AchievementTrail from "./AchievementTrail.js";
import SpecialAwards from "./SpecialAwards.js";
import type { IconName } from "lucide-react/dynamic";

// IDs of badges to hide (retired/redundant)
const HIDDEN_IDS = new Set([7, 8, 9, 103]); // Team Player, Campfire Storyteller, Pathfinder, Trail Guide

// Daily activity badge IDs
const DAILY_IDS = [133, 134, 136, 137, 135]; // Check-In, Survey, Hub Post, Q&A, Peer Feedback

// Special award IDs
const SPECIAL_IDS = new Set([11, 12, 34, 105]); // Camp Spirit, Innovation Award, Wheel Dealer, Alpine Legend

// Achievement trail grouping
const ACHIEVEMENT_GROUPS: { label: string; icon: IconName; color: string; ids: number[] }[] = [
  { label: "Before Camp", icon: "compass", color: "text-cyan-500", ids: [1] },
  { label: "Attendance", icon: "clock", color: "text-emerald-500", ids: [5, 6] },
  { label: "Engagement", icon: "flame", color: "text-orange-500", ids: [67, 100, 102, 166] },
  { label: "Performance", icon: "target", color: "text-red-500", ids: [10, 106] },
  { label: "Feedback", icon: "heart", color: "text-teal-500", ids: [107] },
  { label: "Points Milestones", icon: "mountain", color: "text-amber-500", ids: [2, 3, 4] },
];

export default function TrailMap() {
  const user = useSuperblocksUser();

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;

  const { data: badgesData, loading: loadingBadges } = useApiData("GetBadges", {
    camper_id: camperId || null,
  }, { enabled: camperId > 0 });

  const allBadges = (badgesData?.all_badges ?? []) as any[];
  const earnedBadges = (badgesData?.earned_badges ?? []) as any[];
  const totalPoints = camperData?.camper?.points ?? 0;

  // Earned lookup
  const earnedMap = useMemo(() => {
    const map = new Map<number, { earn_count: number }>();
    for (const eb of earnedBadges) {
      map.set(eb.badge_id, { earn_count: eb.earn_count ?? 1 });
    }
    return map;
  }, [earnedBadges]);

  // Badge lookup
  const badgeMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const b of allBadges) {
      if (!HIDDEN_IDS.has(b.id)) map.set(b.id, b);
    }
    return map;
  }, [allBadges]);

  // Daily badges
  const dailyBadges = useMemo(() =>
    DAILY_IDS.map((id) => {
      const b = badgeMap.get(id);
      if (!b) return null;
      return { ...b, earn_count: earnedMap.get(id)?.earn_count ?? 0 };
    }).filter(Boolean),
  [badgeMap, earnedMap]);

  // Achievement groups
  const achievementGroups = useMemo(() =>
    ACHIEVEMENT_GROUPS.map((g) => ({
      ...g,
      badges: g.ids.map((id) => {
        const b = badgeMap.get(id);
        if (!b) return null;
        return { ...b, earned: earnedMap.has(id) };
      }).filter(Boolean),
    })).filter((g) => g.badges.length > 0),
  [badgeMap, earnedMap]);

  // Special awards
  const specialAwards = useMemo(() =>
    [...SPECIAL_IDS].map((id) => {
      const b = badgeMap.get(id);
      if (!b) return null;
      return { ...b, earned: earnedMap.has(id) };
    }).filter(Boolean),
  [badgeMap, earnedMap]);

  // Stats
  const totalEarned = earnedBadges.length;
  const totalAvailable = badgeMap.size;

  if (loadingCamper || loadingBadges) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero stats */}
      <div className="flex items-center gap-6 p-5 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-rose-500/5 border border-amber-200/30">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Icon icon="zap" className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{totalPoints} XP</div>
            <div className="text-xs text-muted-foreground">Total Points</div>
          </div>
        </div>
        <div className="h-10 w-px bg-border/50" />
        <div>
          <div className="text-2xl font-black text-foreground">{totalEarned}<span className="text-sm font-normal text-muted-foreground">/{totalAvailable}</span></div>
          <div className="text-xs text-muted-foreground">Badges Earned</div>
        </div>
        <div className="h-10 w-px bg-border/50" />
        <div className="flex-1">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                  style={{ width: `${totalAvailable > 0 ? (totalEarned / totalAvailable) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-bold text-amber-600">
              {totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0}%
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Trail completion</div>
        </div>
      </div>

      {/* Daily Trail */}
      <DailyTrail badges={dailyBadges} />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium px-2">⛺ Keep climbing</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Achievement Trail */}
      <AchievementTrail groups={achievementGroups} />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium px-2">🏆 The summit</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Special Awards */}
      <SpecialAwards awards={specialAwards} />
    </div>
  );
}
