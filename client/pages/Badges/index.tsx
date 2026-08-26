import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
};

const CATEGORIES: Record<string, string> = {
  preparation: "Preparation",
  points: "Points Milestones",
  attendance: "Attendance",
  collaboration: "Collaboration",
  engagement: "Engagement",
  feedback: "Feedback",
  performance: "Performance",
  special: "Special Awards",
  general: "General",
};

export default function BadgesPage() {
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
  const earnedIds = useMemo(() => new Set(earnedBadges.map((b) => b.badge_id)), [earnedBadges]);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === "all") return allBadges;
    return allBadges.filter((b) => b.category === selectedCategory);
  }, [allBadges, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(allBadges.map((b) => b.category));
    return Array.from(cats);
  }, [allBadges]);

  if (loadingCamper || loadingBadges) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Icon icon="award" className="w-6 h-6 text-amber-400" />
            Badges & Achievements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {earnedBadges.length}/{allBadges.length} unlocked
          </p>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{CATEGORIES[cat] ?? cat}</SelectItem>
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
            {earnedBadges.map((badge) => (
              <BadgeCard
                key={badge.badge_id}
                name={badge.badge_name}
                description={badge.badge_description}
                icon={badge.badge_icon as IconName}
                color={badge.badge_color}
                earned
                earnedDate={badge.awarded_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* All badges grid */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          {selectedCategory === "all" ? "All Badges" : CATEGORIES[selectedCategory] ?? selectedCategory}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              name={badge.name}
              description={badge.description}
              icon={badge.icon as IconName}
              color={badge.color}
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
    </div>
  );
}

function BadgeCard({
  name,
  description,
  icon,
  color,
  earned,
  earnedDate,
  pointsReward,
  isAdmin,
  badgeId,
  camperId,
  onAwarded,
}: {
  name: string;
  description: string;
  icon: IconName;
  color: string;
  earned: boolean;
  earnedDate?: string;
  pointsReward?: number;
  isAdmin?: boolean;
  badgeId?: number;
  camperId?: number;
  onAwarded?: () => void;
}) {
  const colorClass = BADGE_COLORS[color] ?? BADGE_COLORS.amber;
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
      <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full mb-2 ${
        earned ? "bg-white/10" : "bg-muted/30"
      }`}>
        <Icon icon={icon} className={`w-6 h-6 ${earned ? "" : "text-muted-foreground/50"}`} />
      </div>
      <h3 className={`text-xs font-bold ${earned ? "text-foreground" : "text-muted-foreground"}`}>
        {name}
      </h3>
      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
      {pointsReward && pointsReward > 0 && (
        <span className="text-[10px] text-amber-400 mt-1 block">+{pointsReward} pts</span>
      )}
      {earned && earnedDate && (
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {new Date(earnedDate).toLocaleDateString()}
        </span>
      )}
      {!earned && (
        <div className="absolute top-2 right-2">
          <Icon icon="lock" className="w-3 h-3 text-muted-foreground/40" />
        </div>
      )}
    </Card>
  );
}
