import { useState } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { camperId: number };

const CATEGORY_INFO: Record<string, { icon: string; label: string }> = {
  registration: { icon: "✅", label: "Registration" },
  prework: { icon: "📚", label: "Pre-Work" },
  survey: { icon: "📋", label: "Surveys" },
  bingo: { icon: "🔥", label: "Fireside Finder" },
  presentation: { icon: "🏆", label: "Presentations" },
  participation: { icon: "⭐", label: "Participation" },
  logo_vote: { icon: "🎨", label: "Logo Voting" },
  bonus: { icon: "🎁", label: "Bonus" },
  penalty: { icon: "⚠️", label: "Penalties" },
  wheel_and_deal: { icon: "🎡", label: "Wheel & Deal" },
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{label}</span>
      <span className="truncate text-2xl font-black leading-tight text-white">{value}</span>
      {sub && <span className="text-xs leading-snug text-white/80">{sub}</span>}
    </div>
  );
}

/** Top-of-profile banner: XP earned, current place, and team (with team place). */
export default function ProfileStandingBanner({ camperId }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { data: standing, loading } = useApiData("GetMyStanding", {}, { staleTime: 15_000 });
  const { data: breakdown } = useApiData(
    "GetPointsBreakdown",
    { camper_id: camperId },
    { enabled: camperId > 0 && showBreakdown }
  );

  if (loading || !standing) return <Skeleton className="h-28 w-full rounded-2xl" />;

  const categories = (breakdown?.categories ?? []) as { category: string; total: number }[];
  const team = standing.team;

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-camp-green via-emerald-700 to-amber-600 shadow-md">
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:divide-x sm:divide-white/20">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Icon icon="zap" className="h-6 w-6 text-amber-200" />
          </div>
          <Stat label="XP earned" value={`${standing.points} pts`} />
        </div>

        <div className="flex items-center gap-3 sm:pl-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Icon icon="trophy" className="h-6 w-6 text-amber-200" />
          </div>
          {standing.is_counselor ? (
            <Stat label="Current place" value="Counselor" sub="Counselors aren't ranked" />
          ) : standing.rank ? (
            <Stat label="Current place" value={ordinal(standing.rank)} sub={`of ${standing.total_campers} cAMPers`} />
          ) : (
            <Stat label="Current place" value="—" sub="Not ranked yet" />
          )}
        </div>

        <div className="flex items-center gap-3 sm:pl-4">
          {team?.logo_url ? (
            <img src={team.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon icon="users" className="h-6 w-6 text-amber-200" />
            </div>
          )}
          {team ? (
            <Stat
              label="Your team"
              value={team.name}
              sub={`${ordinal(team.rank)} of ${standing.total_teams} teams · ${team.total_points} pts`}
            />
          ) : (
            <Stat label="Your team" value="No team yet" sub="Teams are assigned at cAMP" />
          )}
        </div>
      </div>

      <div className="border-t border-white/15 bg-black/10 px-5 py-2">
        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-white/85 hover:text-white"
        >
          <Icon icon={showBreakdown ? "chevron-up" : "chevron-down"} className="h-3.5 w-3.5" />
          {showBreakdown ? "Hide XP breakdown" : "See how you earned your XP"}
        </button>
        {showBreakdown && (
          <div className="mt-2 flex flex-wrap gap-2 pb-1">
            {categories.length === 0 ? (
              <span className="text-xs text-white/70">No points earned yet.</span>
            ) : (
              categories.map((cat) => {
                const info = CATEGORY_INFO[cat.category] ?? { icon: "📌", label: cat.category };
                return (
                  <span
                    key={cat.category}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white"
                  >
                    {info.icon} {info.label}
                    <b className={cat.total < 0 ? "text-red-200" : "text-amber-100"}>
                      {cat.total >= 0 ? "+" : ""}
                      {cat.total}
                    </b>
                  </span>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
