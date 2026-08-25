import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type PointCategory = {
  icon: IconName;
  title: string;
  points: string;
  description: string;
  examples: string[];
  color: string;
};

const categories: PointCategory[] = [
  {
    icon: "user-plus",
    title: "Registration & Profile",
    points: "+10 to +25",
    description: "Complete your registration and fill out your cAMP profile to earn your first points.",
    examples: ["Register for cAMP (+10)", "Complete full profile with photo, bio, and fun fact (+15)"],
    color: "bg-camp-green/10 text-camp-green",
  },
  {
    icon: "book-open",
    title: "Pre-Work",
    points: "+5 each",
    description: "Finish pre-work items before cAMP begins. Each completed item earns you points.",
    examples: ["Complete any pre-work item (+5)", "Finish all pre-work items (bonus opportunity)"],
    color: "bg-camp-amber/10 text-camp-amber",
  },
  {
    icon: "users",
    title: "Team Collaboration",
    points: "+5 to +20",
    description: "Work with your team in the Team Hub. Contribution and collaboration earn points.",
    examples: ["Add a resource to your Team Hub (+5)", "Complete a team challenge (+15)", "Team wins a competition (+20 per member)"],
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: "hand-helping",
    title: "Session Participation",
    points: "+5 to +15",
    description: "Actively participate during sessions, ask questions, and engage with speakers.",
    examples: ["Ask a question during executive session (+5)", "Volunteer for a role-play or demo (+10)", "Lead a group discussion (+15)"],
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: "sparkles",
    title: "Bonus & Spirit Points",
    points: "Varies",
    description: "Counselors can award bonus points for going above and beyond.",
    examples: ["Help a fellow cAMPer (+5)", "Show outstanding team spirit (+10)", "Creative solution to a challenge (+10)"],
    color: "bg-pink-500/10 text-pink-600",
  },
];

const principles = [
  { icon: "eye" as IconName, title: "Transparent", description: "Every point earned is logged and visible. You can always see why points were awarded." },
  { icon: "scale" as IconName, title: "Fair", description: "Multiple ways to earn means everyone can contribute. No single path dominates." },
  { icon: "target" as IconName, title: "Achievable", description: "Points are earned through effort and engagement, not luck. Show up and participate." },
  { icon: "lightbulb" as IconName, title: "Informative", description: "The system teaches you what behaviors lead to success at Amplitude." },
];

export default function XPlanationPage() {
  return (
    <div className="flex flex-col gap-8 p-6 w-full overflow-auto max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Icon icon="sparkles" className="w-6 h-6 text-primary" />
          XPlanation — How Points Work
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Points drive the leaderboard and reward engagement throughout your cAMP experience. 
          Here's everything you need to know about earning and tracking points.
        </p>
      </div>

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

      {/* Categories */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Ways to Earn Points</h2>
        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat.title} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${cat.color}`}>
                  <Icon icon={cat.icon} className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">{cat.title}</h3>
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {cat.points}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                  <ul className="mt-1 space-y-1">
                    {cat.examples.map((ex) => (
                      <li key={ex} className="flex items-center gap-2 text-sm text-foreground/80">
                        <Icon icon="check" className="w-3.5 h-3.5 text-camp-green shrink-0" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="lightbulb" className="w-5 h-5 text-camp-amber" />
          Pro Tips
        </h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Complete your profile early — it's the easiest points you'll earn and helps your team get to know you.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Don't wait — pre-work points are only available before cAMP kicks off.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Team points benefit everyone. A rising tide lifts all boats.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Ask questions during exec sessions — it shows engagement and earns bonus points.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Check the leaderboard to see how your team stacks up and identify opportunities.</span>
          </li>
        </ul>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pb-6">
        <p>Points are tracked in real-time and visible on the Leaderboard.</p>
        <p className="mt-1">Questions? Ask your counselor.</p>
      </div>
    </div>
  );
}
