import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

const TIERS = [
  { threshold: 5, bonus: 1 },
  { threshold: 10, bonus: 2 },
  { threshold: 15, bonus: 3 },
  { threshold: 20, bonus: 5 },
];

type BadgeData = {
  name: string;
  icon: string;
  color: string;
  base_points: number;
  earn_count: number;
  badge_type: string;
};

const TIER_COLORS = [
  "bg-slate-400",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-amber-500",
];

export default function ProgressTrackers({ badges }: { badges: BadgeData[] }) {
  const repeatableBadges = useMemo(
    () => badges.filter((b) => b.badge_type === "badge"),
    [badges]
  );

  if (repeatableBadges.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon icon="bar-chart-3" className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Your Progress</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {repeatableBadges.map((b) => (
          <TrackerCard key={b.name} badge={b} />
        ))}
      </div>
    </div>
  );
}

function TrackerCard({ badge }: { badge: BadgeData }) {
  const count = badge.earn_count;

  // Find current tier and next
  const currentTierIdx = TIERS.reduce((acc, t, i) => (count >= t.threshold ? i : acc), -1);
  const nextTier = TIERS[currentTierIdx + 1];
  const currentTier = currentTierIdx >= 0 ? TIERS[currentTierIdx] : null;

  // Progress to next tier
  const prevThreshold = currentTier?.threshold ?? 0;
  const nextThreshold = nextTier?.threshold ?? (TIERS[TIERS.length - 1].threshold);
  const progressInTier = count - prevThreshold;
  const tierRange = nextThreshold - prevThreshold;
  const progressPct = nextTier
    ? Math.min(100, Math.round((progressInTier / tierRange) * 100))
    : 100; // maxed out

  const currentBonus = currentTier?.bonus ?? 0;
  const currentPoints = badge.base_points + currentBonus;
  const tierLabel = currentTierIdx < 0 ? "Base" : `Tier ${currentTierIdx + 1}`;
  const tierColorIdx = Math.min(currentTierIdx + 1, TIER_COLORS.length - 1);
  const isMaxed = !nextTier;

  return (
    <Card className="p-3 bg-card border">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center">
          <Icon icon={badge.icon as IconName} className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{badge.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {currentPoints} pts/earn • {tierLabel}
            {currentBonus > 0 && (
              <span className="text-emerald-400"> (+{currentBonus})</span>
            )}
          </p>
        </div>
        <span className="text-sm font-bold text-foreground">{count}</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${TIER_COLORS[tierColorIdx]}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Tier markers */}
      <div className="flex items-center justify-between mt-1">
        {isMaxed ? (
          <span className="text-[9px] font-bold text-amber-400">MAX TIER ⭐</span>
        ) : (
          <span className="text-[9px] text-muted-foreground">
            {count}/{nextThreshold} to Tier {currentTierIdx + 2}
          </span>
        )}
        {nextTier && (
          <span className="text-[9px] text-emerald-400">
            +{nextTier.bonus} bonus
          </span>
        )}
      </div>
    </Card>
  );
}
