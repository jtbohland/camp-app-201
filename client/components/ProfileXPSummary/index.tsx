import { useApiData } from "@/hooks/useApiData.js";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type Props = {
  camperId: number;
  points: number;
  teamName?: string | null;
};

export default function ProfileXPSummary({ camperId, points, teamName }: Props) {
  // Get points breakdown by category
  const { data } = useApiData("GetPointsBreakdown", {
    camper_id: camperId,
  }, { enabled: camperId > 0 });

  const categories = (data?.categories ?? []) as { category: string; total: number }[];

  const CATEGORY_ICONS: Record<string, { icon: string; label: string; color: string }> = {
    registration: { icon: "✅", label: "Registration", color: "text-green-600" },
    prework: { icon: "📚", label: "Pre-Work", color: "text-blue-600" },
    survey: { icon: "📋", label: "Surveys", color: "text-purple-600" },
    bingo: { icon: "🔥", label: "Fireside Finder", color: "text-orange-600" },
    presentation: { icon: "🏆", label: "Presentations", color: "text-amber-600" },
    participation: { icon: "⭐", label: "Participation", color: "text-yellow-600" },
    logo_vote: { icon: "🎨", label: "Logo Voting", color: "text-pink-600" },
    bonus: { icon: "🎁", label: "Bonus", color: "text-emerald-600" },
    penalty: { icon: "⚠️", label: "Penalties", color: "text-red-600" },
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
        <Icon icon="zap" className="w-5 h-5 text-amber-500" />
        Your XP
      </h2>

      {/* Big score */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md">
          <span className="text-2xl font-black">{points}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Total XP Earned</p>
          {teamName && (
            <p className="text-xs text-muted-foreground">Contributing to {teamName}</p>
          )}
        </div>
      </div>

      {/* Breakdown by category */}
      {categories.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-border/50">
          {categories.map((cat) => {
            const info = CATEGORY_ICONS[cat.category] ?? { icon: "📌", label: cat.category, color: "text-muted-foreground" };
            return (
              <div key={cat.category} className="flex items-center justify-between text-sm py-1">
                <span className="flex items-center gap-2">
                  <span>{info.icon}</span>
                  <span className="text-muted-foreground">{info.label}</span>
                </span>
                <span className={`font-semibold ${cat.total >= 0 ? info.color : "text-red-500"}`}>
                  {cat.total >= 0 ? "+" : ""}{cat.total}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
