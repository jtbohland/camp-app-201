import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type PointCategory = {
  icon: IconName;
  title: string;
  items: { label: string; points: string; positive: boolean }[];
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
      { label: "All pre-work done 1-2 days early", points: "+10 bonus", positive: true },
      { label: "Incomplete item at deadline", points: "-10 each", positive: false },
    ],
  },
  {
    icon: "log-in",
    title: "Check-Ins",
    color: "bg-emerald-500/10 text-emerald-600",
    items: [
      { label: "Check in early (before session starts)", points: "+3", positive: true },
      { label: "Check in on time", points: "+1", positive: true },
      { label: "Check in late", points: "-2", positive: false },
    ],
  },
  {
    icon: "clipboard-list",
    title: "Daily Surveys",
    color: "bg-blue-500/10 text-blue-600",
    items: [
      { label: "Submit daily survey on time (before 9am PT)", points: "+5", positive: true },
      { label: "Submit within 1-hour grace period", points: "-3", positive: false },
      { label: "No submission after grace period", points: "-5", positive: false },
      { label: "Team race bonus — 1st team all submitted", points: "+15", positive: true },
      { label: "Team race bonus — 2nd team", points: "+10", positive: true },
      { label: "Team race bonus — 3rd team", points: "+5", positive: true },
      { label: "Team race bonus — 4th team", points: "+3", positive: true },
    ],
  },
  {
    icon: "palette",
    title: "Team Logo Voting",
    color: "bg-amber-500/10 text-amber-600",
    items: [
      { label: "Winning logo — 1st place team", points: "+20", positive: true },
      { label: "2nd place team", points: "+15", positive: true },
      { label: "3rd place team", points: "+10", positive: true },
      { label: "4th place team", points: "+5", positive: true },
    ],
  },
  {
    icon: "flame",
    title: "Fireside Finder (Bingo)",
    color: "bg-orange-500/10 text-orange-600",
    items: [
      { label: "Correct bingo guess", points: "+2", positive: true },
      { label: "Complete a full row (BINGO!)", points: "+10 bonus", positive: true },
      { label: "Same person guessed back-to-back", points: "-2", positive: false },
    ],
  },
  {
    icon: "users",
    title: "Team Collaboration",
    color: "bg-purple-500/10 text-purple-600",
    items: [
      { label: "Complete a team challenge", points: "+15", positive: true },
      { label: "Team wins a competition", points: "+20/member", positive: true },
    ],
  },
  {
    icon: "hand-helping",
    title: "Session Participation",
    color: "bg-teal-500/10 text-teal-600",
    items: [
      { label: "Ask a question during executive session", points: "+5", positive: true },
      { label: "Volunteer for a role-play or demo", points: "+10", positive: true },
      { label: "Lead a group discussion", points: "+15", positive: true },
    ],
  },
  {
    icon: "presentation",
    title: "Presentations & EBR",
    color: "bg-orange-500/10 text-orange-600",
    items: [
      { label: "Team presentation scored by counselor rubric", points: "Up to 15", positive: true },
      { label: "Peer feedback submitted", points: "+3", positive: true },
    ],
  },
  {
    icon: "cpu",
    title: "AI Hackathon",
    color: "bg-violet-500/10 text-violet-600",
    items: [
      { label: "Submit a hackathon project", points: "+10", positive: true },
      { label: "Win the hackathon vote", points: "+20/member", positive: true },
    ],
  },
  {
    icon: "sparkles",
    title: "Bonus & Spirit Points",
    color: "bg-pink-500/10 text-pink-600",
    items: [
      { label: "Help a fellow cAMPer (counselor-awarded)", points: "+5", positive: true },
      { label: "Outstanding team spirit (counselor-awarded)", points: "+10", positive: true },
      { label: "Creative solution to a challenge", points: "+10", positive: true },
      { label: "Hidden easter eggs throughout the app", points: "+5", positive: true },
    ],
  },
];

const principles: { icon: IconName; title: string; description: string }[] = [
  { icon: "eye", title: "Transparent", description: "Every point earned or lost is logged. You can always see why." },
  { icon: "scale", title: "Fair", description: "Multiple ways to earn means everyone can contribute. No single path dominates." },
  { icon: "target", title: "Achievable", description: "Points are earned through effort and engagement, not luck. Show up and participate." },
  { icon: "shield", title: "Team Matters", description: "Your team earns collectively. Survey speed, logo votes, and presentation scores affect the whole team." },
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

      {/* Categories */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Points Breakdown</h2>
        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat.title} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${cat.color}`}>
                  <Icon icon={cat.icon} className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <h3 className="text-base font-semibold text-foreground">{cat.title}</h3>
                  <div className="space-y-1.5">
                    {cat.items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-foreground/80">
                          <Icon
                            icon={item.positive ? "check" : "minus"}
                            className={`w-3.5 h-3.5 shrink-0 ${item.positive ? "text-camp-green" : "text-red-500"}`}
                          />
                          {item.label}
                        </span>
                        <span className={`text-sm font-bold whitespace-nowrap ${
                          item.positive ? "text-camp-green" : "text-red-500"
                        }`}>
                          {item.points}
                        </span>
                      </div>
                    ))}
                  </div>
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
            <span>Complete your profile early — it's the easiest +15 you'll earn.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Submit surveys before 9am PT each day — your team gets bonus points if you're fast!</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Check in early for +3 instead of +1 — small margins add up.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Design a winning logo — your whole team earns up to +20 pts from the vote!</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground/80">
            <Icon icon="arrow-right" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>Team points benefit everyone. A rising tide lifts all boats.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
