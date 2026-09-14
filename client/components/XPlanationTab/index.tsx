import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import type { IconName } from "lucide-react/dynamic";

// ─── Accelerator Explainer ───

const ACCEL_TIERS = [
  { earns: "1–4", bonus: "+0", label: "Base" },
  { earns: "5–9", bonus: "+1", label: "Tier 1" },
  { earns: "10–14", bonus: "+2", label: "Tier 2" },
  { earns: "15–19", bonus: "+3", label: "Tier 3" },
  { earns: "20+", bonus: "+5", label: "Tier 4 (MAX)" },
];

// ─── Point Categories ───

type PointItem = { label: string; points: string; positive: boolean; note?: string };
type PointCategory = {
  icon: IconName;
  title: string;
  subtitle?: string;
  items: PointItem[];
  color: string;
};

const categories: PointCategory[] = [
  {
    icon: "user-plus",
    title: "Registration & Profile",
    color: "bg-camp-green/10 text-camp-green",
    items: [
      { label: "Register for cAMP", points: "+10", positive: true },
      { label: "Complete full profile (photo, bio, fun fact, goals, ice breakers)", points: "+15", positive: true },
    ],
  },
  {
    icon: "book-open",
    title: "Pre-Work",
    color: "bg-camp-amber/10 text-camp-amber",
    items: [
      { label: "Complete any pre-work item", points: "+5 each", positive: true },
      { label: "All pre-work done 2+ days early", points: "+15 bonus", positive: true },
      { label: "All pre-work done 1–2 days early", points: "+10 bonus", positive: true },
      { label: "Incomplete item at deadline", points: "-10 each", positive: false },
    ],
  },
  {
    icon: "log-in",
    title: "Check-Ins",
    subtitle: "🚀 Accelerated — the more you check in early, the more each one is worth!",
    color: "bg-emerald-500/10 text-emerald-600",
    items: [
      { label: "Check in 10+ min early", points: "5 base", positive: true, note: "Earns a Check-In badge + accelerator bonus" },
      { label: "Check in on time", points: "+3", positive: true },
      { label: "Check in late", points: "-2", positive: false },
      { label: "First team to all check in", points: "+5 team pts", positive: true, note: "Goes to team_points, not individual" },
      { label: "2nd team to check in", points: "+3 team pts", positive: true },
      { label: "3rd team", points: "+1 team pt", positive: true },
    ],
  },
  {
    icon: "clipboard-list",
    title: "Daily Surveys",
    subtitle: "📈 Escalating — points grow each day you submit!",
    color: "bg-blue-500/10 text-blue-600",
    items: [
      { label: "Day 1 survey submitted", points: "+2", positive: true },
      { label: "Day 2 survey submitted", points: "+4", positive: true },
      { label: "Day 3 survey submitted", points: "+6", positive: true },
      { label: "Day 4 survey submitted", points: "+8", positive: true },
      { label: "Day 5 survey submitted", points: "+10", positive: true },
      { label: "First team all surveys in", points: "+5 team pts", positive: true },
      { label: "2nd team", points: "+3 team pts", positive: true },
      { label: "3rd team", points: "+1 team pt", positive: true },
    ],
  },
  {
    icon: "message-circle",
    title: "Peer Feedback",
    subtitle: "🚀 Accelerated — give more feedback, earn more each time!",
    color: "bg-teal-500/10 text-teal-600",
    items: [
      { label: "Give peer feedback", points: "3 base", positive: true, note: "Earns a Peer Feedback badge + accelerator bonus" },
    ],
  },
  {
    icon: "lightbulb",
    title: "Team Hub Contributions",
    subtitle: "🚀 Accelerated — share ideas, tips, and resources!",
    color: "bg-orange-500/10 text-orange-600",
    items: [
      { label: "Post to Team Hub", points: "3 base", positive: true, note: "Earns a Hub Post badge + accelerator bonus" },
    ],
  },
  {
    icon: "help-circle",
    title: "Executive Q&A",
    subtitle: "🚀 Accelerated — ask more questions, earn more!",
    color: "bg-blue-500/10 text-blue-600",
    items: [
      { label: "Submit a question during exec session", points: "2 base", positive: true, note: "Earns a Q&A Contributor badge + accelerator bonus" },
    ],
  },
  {
    icon: "flame",
    title: "Fireside Finder (Bingo)",
    color: "bg-orange-500/10 text-orange-600",
    items: [
      { label: "Correct bingo guess", points: "+2 each", positive: true },
      { label: "1st BINGO (row/column/diagonal)", points: "+15 bonus", positive: true },
      { label: "2nd BINGO", points: "+10 bonus", positive: true },
      { label: "3rd BINGO", points: "+7 bonus", positive: true },
      { label: "4th+ BINGO", points: "+3 each", positive: true },
      { label: "BLACKOUT (all 24!)", points: "+20 bonus", positive: true },
    ],
  },
  {
    icon: "presentation",
    title: "Presentations (Rubric Scores)",
    subtitle: "Team points! Improve each time for bonus points.",
    color: "bg-purple-500/10 text-purple-600",
    items: [
      { label: "Value Pillars rubric score", points: "team pts", positive: true, note: "Score goes directly to team_points" },
      { label: "Value Discovery rubric score", points: "team pts", positive: true },
      { label: "Mini EBR rubric score (per counselor)", points: "team pts", positive: true, note: "Up to 50 per counselor, stacks" },
      { label: "5%+ improvement over previous presentation", points: "+3 team", positive: true },
      { label: "10%+ improvement", points: "+5 team", positive: true },
      { label: "First time scoring 90%+", points: "+7 team", positive: true },
      { label: "Perfect score (100%)", points: "+10 team", positive: true },
    ],
  },
  {
    icon: "refresh-cw",
    title: "Wheel & Deal",
    color: "bg-indigo-500/10 text-indigo-600",
    items: [
      { label: "Pitch in front of the room (courage!)", points: "+5", positive: true },
      { label: "Self-eval within 1 pt of room avg", points: "+3", positive: true },
      { label: "Self-eval within 2 pts", points: "+2", positive: true },
      { label: "Self-eval 3+ pts off", points: "+1", positive: true },
      { label: "Room avg ≥ 12/15", points: "+2 bonus", positive: true },
    ],
  },
  {
    icon: "cpu",
    title: "AI Hackathon",
    color: "bg-violet-500/10 text-violet-600",
    items: [
      { label: "Winning team (most peer votes)", points: "+15 team pts", positive: true },
      { label: "Innovation Award badge for all winning members", points: "🏆 Badge", positive: true },
    ],
  },
  {
    icon: "camera",
    title: "Memories",
    color: "bg-rose-500/10 text-rose-600",
    items: [
      { label: "First photo uploaded", points: "+2", positive: true },
      { label: "First text memory shared", points: "+1", positive: true },
      { label: "KINDling badge — shared both a photo + text", points: "🏅 Badge", positive: true },
    ],
  },
];

const principles: { icon: IconName; title: string; description: string }[] = [
  { icon: "eye", title: "Transparent", description: "Every point is logged. You can always see exactly why." },
  { icon: "scale", title: "Fair", description: "Team bonuses go to team_points (not inflated per-member). Individual effort is rewarded individually." },
  { icon: "trending-up", title: "Accelerated", description: "The more you do, the more each action is worth. Consistency is rewarded." },
  { icon: "shield", title: "Team + Individual", description: "cAMP-V-P crowns the top individual. cAMP Champ crowns the top team." },
];

export default function XPlanationTab() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Principles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {principles.map((p) => (
          <div key={p.title} className="flex flex-col gap-2 p-4 bg-card border border-border rounded-xl">
            <Icon icon={p.icon} className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
            <p className="text-xs text-muted-foreground">{p.description}</p>
          </div>
        ))}
      </div>

      {/* Awards Explainer */}
      <Card className="p-5 border-amber-700/30 bg-amber-900/5">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="trophy" className="w-5 h-5 text-amber-400" />
          Two Leaderboards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/20 border">
            <p className="text-sm font-bold text-foreground">🏆 cAMP-V-P</p>
            <p className="text-xs text-muted-foreground mt-1">
              Highest <span className="font-semibold text-foreground">individual</span> points. Your personal score from check-ins, surveys, feedback, badges, etc.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/20 border">
            <p className="text-sm font-bold text-foreground">🏕 cAMP Champ</p>
            <p className="text-xs text-muted-foreground mt-1">
              Highest <span className="font-semibold text-foreground">team</span> score = sum of all members' individual points + team_points (check-in race, survey race, rubrics, hackathon).
            </p>
          </div>
        </div>
      </Card>

      {/* Accelerator Explainer */}
      <Card className="p-5 border-emerald-700/30 bg-emerald-900/5">
        <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
          <Icon icon="zap" className="w-5 h-5 text-emerald-400" />
          How Accelerators Work
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Check-Ins, Peer Feedback, Hub Posts, and Exec Q&A all use the accelerator system.
          The more you earn a badge, the more each action is worth. Keep going!
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 font-semibold text-muted-foreground">Times Earned</th>
                <th className="text-left py-1.5 font-semibold text-muted-foreground">Tier</th>
                <th className="text-left py-1.5 font-semibold text-muted-foreground">Bonus / earn</th>
                <th className="text-left py-1.5 font-semibold text-muted-foreground">Example (base 5)</th>
              </tr>
            </thead>
            <tbody>
              {ACCEL_TIERS.map((t) => (
                <tr key={t.label} className="border-b border-border/50">
                  <td className="py-1.5 text-foreground">{t.earns}</td>
                  <td className="py-1.5 text-foreground font-medium">{t.label}</td>
                  <td className="py-1.5 text-emerald-400 font-bold">{t.bonus}</td>
                  <td className="py-1.5 text-muted-foreground">{t.bonus === "+0" ? "5 pts" : `5 ${t.bonus} = ${5 + parseInt(t.bonus)} pts`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Categories */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Full Points Breakdown</h2>
        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat.title} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${cat.color}`}>
                  <Icon icon={cat.icon} className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <h3 className="text-base font-semibold text-foreground">{cat.title}</h3>
                  {cat.subtitle && (
                    <p className="text-[11px] text-emerald-400 font-medium -mt-1">{cat.subtitle}</p>
                  )}
                  <div className="space-y-1.5">
                    {cat.items.map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-sm text-foreground/80">
                            <Icon
                              icon={item.positive ? "check" : "minus"}
                              className={`w-3.5 h-3.5 shrink-0 ${item.positive ? "text-camp-green" : "text-red-500"}`}
                            />
                            {item.label}
                          </span>
                          {item.points && (
                            <span className={`text-sm font-bold whitespace-nowrap ${
                              item.positive ? "text-camp-green" : "text-red-500"
                            }`}>
                              {item.points}
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <p className="text-[10px] text-muted-foreground ml-5.5 mt-0.5">{item.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Tips */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="lightbulb" className="w-5 h-5 text-camp-amber" />
          Pro Tips
        </h2>
        <ul className="space-y-2">
          {[
            "Complete your profile early — it's the easiest +15 you'll earn.",
            "Check in 10+ min early every time — the accelerator makes each one worth more.",
            "Submit surveys every day — points escalate from +2 to +10 by Day 5.",
            "Give peer feedback often — accelerator bonuses stack fast.",
            "The Mini EBR is the highest-value presentation — each counselor can award up to 50 team pts.",
            "Team points matter! Check-in races, survey races, and rubric scores all boost your team.",
            "Share a photo AND a text memory to earn the KINDling badge.",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm text-foreground/80">
              <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
