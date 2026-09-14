import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

const TIER_LABELS = ["Base", "Tier 1", "Tier 2", "Tier 3", "MAX"];
const TIER_THRESHOLDS = [0, 5, 10, 15, 20];
const TIER_COLORS = [
  "bg-zinc-100 text-zinc-600",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-gradient-to-r from-amber-200 to-orange-200 text-orange-800",
];

type DailyBadge = {
  id: number;
  name: string;
  icon: string;
  color: string;
  base_points: number;
  description: string;
  earn_count: number;
};

type Props = {
  badges: DailyBadge[];
};

const COLOR_MAP: Record<string, { bg: string; ring: string; text: string; glow: string }> = {
  green:  { bg: "bg-emerald-500", ring: "ring-emerald-400/30", text: "text-emerald-500", glow: "shadow-emerald-500/20" },
  teal:   { bg: "bg-teal-500",    ring: "ring-teal-400/30",    text: "text-teal-500",    glow: "shadow-teal-500/20" },
  orange: { bg: "bg-orange-500",   ring: "ring-orange-400/30",  text: "text-orange-500",  glow: "shadow-orange-500/20" },
  blue:   { bg: "bg-blue-500",     ring: "ring-blue-400/30",    text: "text-blue-500",    glow: "shadow-blue-500/20" },
  purple: { bg: "bg-purple-500",   ring: "ring-purple-400/30",  text: "text-purple-500",  glow: "shadow-purple-500/20" },
};

function getTier(count: number) {
  let tier = 0;
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (count >= TIER_THRESHOLDS[i]) { tier = i; break; }
  }
  return tier;
}

function getNextMilestone(count: number) {
  for (const t of TIER_THRESHOLDS) {
    if (t > count) return t;
  }
  return null;
}

export default function DailyTrail({ badges }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Icon icon="repeat" className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Daily Activities</h2>
          <p className="text-xs text-muted-foreground">Do these every day to earn points — the more you do, the more each one is worth!</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {badges.map((b) => {
          const earned = b.earn_count > 0;
          const tier = getTier(b.earn_count);
          const next = getNextMilestone(b.earn_count);
          const colors = COLOR_MAP[b.color] ?? COLOR_MAP.blue;

          return (
            <div
              key={b.id}
              className={`relative flex flex-col items-center p-4 rounded-xl border transition-all ${
                earned
                  ? `bg-background border-border shadow-md ${colors.glow} shadow-lg`
                  : "bg-muted/30 border-border/50 opacity-60"
              }`}
            >
              {/* Badge circle */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${
                earned ? `${colors.bg} text-white ring-4 ${colors.ring}` : "bg-muted text-muted-foreground"
              }`}>
                <Icon icon={b.icon as IconName} className="w-6 h-6" />
              </div>

              {/* Name + count */}
              <span className="text-sm font-semibold text-center leading-tight">{b.name}</span>
              {earned && (
                <span className={`text-xs font-bold mt-0.5 ${colors.text}`}>×{b.earn_count}</span>
              )}

              {/* Points per earn */}
              <span className="text-[10px] text-muted-foreground mt-1">
                {b.id === 134
                  ? "2→4→6→8→10 pts/day"
                  : `${b.base_points} pts${tier > 0 ? ` +${[0,1,2,3,5][tier]} bonus` : ""} each`
                }
              </span>

              {/* Tier pill */}
              {earned && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${TIER_COLORS[tier]}`}>
                  {TIER_LABELS[tier]}
                </span>
              )}

              {/* Progress to next tier */}
              {earned && next !== null && (
                <div className="w-full mt-2">
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors.bg}`}
                      style={{ width: `${Math.min(100, (b.earn_count / next) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-0.5 block text-center">
                    {b.earn_count}/{next} to next tier
                  </span>
                </div>
              )}

              {next === null && earned && (
                <span className="text-[9px] text-amber-600 font-medium mt-1">🔥 Maxed out!</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
