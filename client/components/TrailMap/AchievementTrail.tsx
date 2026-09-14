import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type MeritBadge = {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string;
  points_reward: number;
  earned: boolean;
};

type MeritGroup = {
  label: string;
  icon: IconName;
  color: string;
  badges: MeritBadge[];
};

type Props = {
  groups: MeritGroup[];
};

const EARNED_RING: Record<string, string> = {
  green:  "ring-emerald-400/40 bg-emerald-500",
  amber:  "ring-amber-400/40 bg-amber-500",
  yellow: "ring-yellow-400/40 bg-yellow-500",
  orange: "ring-orange-400/40 bg-orange-500",
  purple: "ring-purple-400/40 bg-purple-500",
  red:    "ring-red-400/40 bg-red-500",
  rose:   "ring-rose-400/40 bg-rose-500",
  blue:   "ring-blue-400/40 bg-blue-500",
  teal:   "ring-teal-400/40 bg-teal-500",
  cyan:   "ring-cyan-400/40 bg-cyan-500",
};

export default function AchievementTrail({ groups }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Icon icon="map" className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Achievement Trail</h2>
          <p className="text-xs text-muted-foreground">Milestones you unlock by going above and beyond</p>
        </div>
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-2.5">
              <Icon icon={group.icon} className={`w-3.5 h-3.5 ${group.color}`} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Connected badge nodes */}
            <div className="flex flex-wrap gap-3 items-start">
              {group.badges.map((b, i) => {
                const ringClass = EARNED_RING[b.color] ?? EARNED_RING.blue;
                return (
                  <div key={b.id} className="flex items-center gap-3">
                    <div className={`flex flex-col items-center w-[100px] ${b.earned ? "" : "opacity-50"}`}>
                      {/* Circle */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        b.earned
                          ? `${ringClass} text-white ring-4 shadow-lg`
                          : "bg-muted text-muted-foreground border-2 border-dashed border-border"
                      }`}>
                        <Icon icon={b.icon as IconName} className="w-5 h-5" />
                      </div>
                      {/* Name */}
                      <span className="text-xs font-semibold text-center mt-1.5 leading-tight">{b.name}</span>
                      {/* Description */}
                      <span className="text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">{b.description}</span>
                      {/* Points pill */}
                      {b.points_reward > 0 && (
                        <span className={`text-[10px] font-bold mt-1 ${b.earned ? "text-amber-500" : "text-muted-foreground"}`}>
                          +{b.points_reward} pts
                        </span>
                      )}
                      {b.earned && (
                        <span className="text-[10px] text-emerald-500 font-bold mt-0.5">✓ Earned</span>
                      )}
                    </div>
                    {/* Connector arrow */}
                    {i < group.badges.length - 1 && group.badges.length <= 3 && (
                      <div className="text-border/60 mb-8">
                        <Icon icon="chevron-right" className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
