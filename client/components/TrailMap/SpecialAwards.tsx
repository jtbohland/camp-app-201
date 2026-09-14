import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type SpecialAward = {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string;
  points_reward: number;
  earned: boolean;
};

type Props = {
  awards: SpecialAward[];
};

const GLOW: Record<string, string> = {
  rose:   "from-rose-500/20 via-rose-400/10 to-transparent border-rose-400/30",
  cyan:   "from-cyan-500/20 via-cyan-400/10 to-transparent border-cyan-400/30",
  orange: "from-orange-500/20 via-orange-400/10 to-transparent border-orange-400/30",
  amber:  "from-amber-500/20 via-amber-400/10 to-transparent border-amber-400/30",
};

const ICON_BG: Record<string, string> = {
  rose:   "bg-rose-500 ring-rose-400/40",
  cyan:   "bg-cyan-500 ring-cyan-400/40",
  orange: "bg-orange-500 ring-orange-400/40",
  amber:  "bg-amber-500 ring-amber-400/40",
};

export default function SpecialAwards({ awards }: Props) {
  // Alpine Legend is the crown jewel — always last
  const sorted = [...awards].sort((a, b) => (a.id === 105 ? 1 : b.id === 105 ? -1 : 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
          <Icon icon="trophy" className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Special Awards</h2>
          <p className="text-xs text-muted-foreground">Rare honors — voted by peers or earned through legendary performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((a) => {
          const isAlpine = a.id === 105;
          const glowClass = GLOW[a.color] ?? GLOW.rose;
          const iconBg = ICON_BG[a.color] ?? ICON_BG.rose;

          return (
            <div
              key={a.id}
              className={`relative rounded-xl border p-5 transition-all ${
                isAlpine ? "sm:col-span-2" : ""
              } ${
                a.earned
                  ? `bg-gradient-to-br ${glowClass} shadow-lg`
                  : "bg-muted/20 border-border/50 opacity-50"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                  a.earned
                    ? `${iconBg} text-white ring-4 shadow-lg`
                    : "bg-muted text-muted-foreground border-2 border-dashed border-border"
                }`}>
                  <Icon icon={a.icon as IconName} className={`${isAlpine ? "w-7 h-7" : "w-6 h-6"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold ${isAlpine ? "text-lg" : "text-base"}`}>{a.name}</h3>
                    {a.points_reward > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        a.earned ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                      }`}>
                        +{a.points_reward} pts
                      </span>
                    )}
                    {a.earned && (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                        <Icon icon="check-circle" className="w-3.5 h-3.5" /> Earned
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                  {isAlpine && !a.earned && (
                    <p className="text-xs text-amber-600/70 mt-2 italic">
                      The rarest badge at cAMP — only one person can earn this
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
