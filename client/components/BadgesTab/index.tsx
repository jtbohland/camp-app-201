import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import type { IconName } from "lucide-react/dynamic";

const BADGE_COLORS: Record<string, string> = {
  amber: "from-amber-500/20 to-amber-700/20 border-amber-500/40 text-amber-400",
  green: "from-green-500/20 to-green-700/20 border-green-500/40 text-green-400",
  blue: "from-blue-500/20 to-blue-700/20 border-blue-500/40 text-blue-400",
  purple: "from-purple-500/20 to-purple-700/20 border-purple-500/40 text-purple-400",
  red: "from-red-500/20 to-red-700/20 border-red-500/40 text-red-400",
  orange: "from-orange-500/20 to-orange-700/20 border-orange-500/40 text-orange-400",
  yellow: "from-yellow-500/20 to-yellow-700/20 border-yellow-500/40 text-yellow-400",
  rose: "from-rose-500/20 to-rose-700/20 border-rose-500/40 text-rose-400",
  cyan: "from-cyan-500/20 to-cyan-700/20 border-cyan-500/40 text-cyan-400",
  teal: "from-teal-500/20 to-teal-700/20 border-teal-500/40 text-teal-400",
  indigo: "from-indigo-500/20 to-indigo-700/20 border-indigo-500/40 text-indigo-400",
  pink: "from-pink-500/20 to-pink-700/20 border-pink-500/40 text-pink-400",
};

const CATEGORY_META: Record<string, { label: string; icon: IconName; pill: string }> = {
  preparation: { label: "Preparation", icon: "book-open", pill: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  points: { label: "Points Milestones", icon: "trending-up", pill: "bg-amber-100 text-amber-700 border-amber-200" },
  attendance: { label: "Attendance", icon: "log-in", pill: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  collaboration: { label: "Collaboration", icon: "users", pill: "bg-purple-100 text-purple-700 border-purple-200" },
  engagement: { label: "Engagement", icon: "flame", pill: "bg-orange-100 text-orange-700 border-orange-200" },
  feedback: { label: "Feedback", icon: "message-circle", pill: "bg-teal-100 text-teal-700 border-teal-200" },
  performance: { label: "Performance", icon: "trophy", pill: "bg-red-100 text-red-700 border-red-200" },
  special: { label: "Special Awards", icon: "crown", pill: "bg-pink-100 text-pink-700 border-pink-200" },
  general: { label: "General", icon: "star", pill: "bg-gray-100 text-gray-700 border-gray-200" },
};

// Preferred category display order
const CATEGORY_ORDER = ["preparation", "attendance", "engagement", "feedback", "collaboration", "performance", "points", "special", "general"];

export default function BadgesTab() {
  const user = useSuperblocksUser();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

  const { data: badgesData, loading: loadingBadges, refetch } = useApiData("GetBadges", {
    camper_id: camperId || null,
  }, { enabled: camperId > 0 });

  const allBadges = badgesData?.all_badges ?? [];
  const earnedBadges = badgesData?.earned_badges ?? [];
  const earnedIds = useMemo(() => new Set(earnedBadges.map((b: any) => b.badge_id)), [earnedBadges]);
  const earnCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of earnedBadges) map.set((b as any).badge_id, (b as any).earn_count ?? 1);
    return map;
  }, [earnedBadges]);

  // Separate repeatable badges from one-time merits
  const repeatableBadges = useMemo(() => allBadges.filter((b: any) => b.badge_type === "badge"), [allBadges]);
  const merits = useMemo(() => allBadges.filter((b: any) => b.badge_type === "merit"), [allBadges]);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === "all") return allBadges;
    return allBadges.filter((b: any) => b.category === selectedCategory);
  }, [allBadges, selectedCategory]);

  // Group badges by category for "All" view
  const groupedBadges = useMemo(() => {
    if (selectedCategory !== "all") return null;
    const groups: Record<string, any[]> = {};
    for (const b of allBadges) {
      const cat = (b as any).category || "general";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({ category: cat, badges: groups[cat] }));
  }, [allBadges, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(allBadges.map((b: any) => b.category));
    return CATEGORY_ORDER.filter((cat) => cats.has(cat));
  }, [allBadges]);

  if (loadingCamper || loadingBadges) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Filter + Progress */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {earnedBadges.length}/{allBadges.length} unlocked
        </p>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_META[cat]?.label ?? cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Progress Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Collection Progress</span>
          <span className="text-sm text-amber-400 font-bold">
            {allBadges.length > 0 ? Math.round((earnedBadges.length / allBadges.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-700"
            style={{ width: `${allBadges.length > 0 ? (earnedBadges.length / allBadges.length) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {/* Earned section */}
      {earnedBadges.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon icon="sparkles" className="w-4 h-4 text-amber-400" />
            Earned ({earnedBadges.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {earnedBadges.map((badge: any) => (
              <BadgeCard
                key={badge.badge_id}
                name={badge.badge_name}
                description={badge.badge_description}
                icon={badge.badge_icon as IconName}
                color={badge.badge_color}
                category={badge.badge_category}
                badgeType={badge.badge_type}
                earnCount={badge.earn_count}
                earned
                earnedDate={badge.awarded_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grouped by category (when "All" selected) */}
      {groupedBadges ? (
        <div className="space-y-6">
          {groupedBadges.map(({ category, badges }) => {
            const meta = CATEGORY_META[category] ?? CATEGORY_META.general;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon icon={meta.icon} className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">{meta.label}</h2>
                  <span className="text-[10px] text-muted-foreground">({badges.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {badges.map((badge: any) => (
                    <BadgeCard
                      key={badge.id}
                      name={badge.name}
                      description={badge.description}
                      icon={badge.icon as IconName}
                      color={badge.color}
                      category={badge.category}
                      badgeType={badge.badge_type}
                      earnCount={earnCountMap.get(badge.id) ?? 0}
                      earned={earnedIds.has(badge.id)}
                      pointsReward={badge.points_reward}
                      isAdmin={isAdmin}
                      badgeId={badge.id}
                      camperId={camperId}
                      onAwarded={refetch}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {CATEGORY_META[selectedCategory]?.label ?? selectedCategory}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredBadges.map((badge: any) => (
              <BadgeCard
                key={badge.id}
                name={badge.name}
                description={badge.description}
                icon={badge.icon as IconName}
                color={badge.color}
                category={badge.category}
                badgeType={badge.badge_type}
                earnCount={earnCountMap.get(badge.id) ?? 0}
                earned={earnedIds.has(badge.id)}
                pointsReward={badge.points_reward}
                isAdmin={isAdmin}
                badgeId={badge.id}
                camperId={camperId}
                onAwarded={refetch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeCard({
  name, description, icon, color, category, earned, earnedDate, pointsReward, isAdmin, badgeId, camperId, onAwarded, earnCount, badgeType,
}: {
  name: string; description: string; icon: IconName; color: string; category?: string;
  earned: boolean; earnedDate?: string; pointsReward?: number;
  isAdmin?: boolean; badgeId?: number; camperId?: number; onAwarded?: () => void;
  earnCount?: number; badgeType?: string;
}) {
  const colorClass = BADGE_COLORS[color] ?? BADGE_COLORS.amber;
  const catMeta = CATEGORY_META[category ?? "general"] ?? CATEGORY_META.general;
  const { run: awardBadge, loading: awarding } = useApi("AwardBadge");

  const handleAward = useCallback(async () => {
    if (!badgeId || !camperId) return;
    try {
      const result = await awardBadge({ camper_id: camperId, badge_id: badgeId, awarded_by: camperId });
      if (result?.success) {
        toast.success(`Badge "${name}" unlocked!`);
        onAwarded?.();
      } else if (result?.already_earned) {
        toast.info("Already earned this badge");
      }
    } catch (err) {
      toast.error("Failed to award badge");
    }
  }, [badgeId, camperId, name, awardBadge, onAwarded]);

  return (
    <Card className={`relative p-4 text-center bg-gradient-to-br border transition-all ${
      earned ? colorClass : "from-muted/20 to-muted/40 border-border opacity-60"
    } ${earned ? "hover:scale-[1.02]" : ""}`}>
      {/* Category pill */}
      <div className="absolute top-2 left-2">
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${catMeta.pill}`}>
          {catMeta.label}
        </span>
      </div>
      {!earned && (
        <div className="absolute top-2 right-2">
          <Icon icon="lock" className="w-3 h-3 text-muted-foreground/40" />
        </div>
      )}
      {/* Earn count indicator for repeatable badges */}
      {earned && badgeType === "badge" && (earnCount ?? 0) > 0 && (
        <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          ×{earnCount}
        </div>
      )}
      <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full mb-2 mt-3 ${
        earned ? "bg-white/10" : "bg-muted/30"
      }`}>
        <Icon icon={icon} className={`w-6 h-6 ${earned ? "" : "text-muted-foreground/50"}`} />
      </div>
      <h3 className={`text-xs font-bold ${earned ? "text-foreground" : "text-muted-foreground"}`}>
        {name}
      </h3>
      <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      {pointsReward != null && pointsReward > 0 && (
        <span className="text-[10px] text-amber-400 mt-1 block">+{pointsReward} pts</span>
      )}
      {earned && earnedDate && (
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {new Date(earnedDate).toLocaleDateString()}
        </span>
      )}
    </Card>
  );
}
