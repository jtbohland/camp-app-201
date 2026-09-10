import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type Props = {
  onNavigate: (section: string) => void;
};

type GuideSection = {
  icon: IconName;
  title: string;
  navKey: string;
  description: string;
  whatItDoes: string[];
  impact: string;
  tip?: string;
};

const SECTIONS: GuideSection[] = [
  {
    icon: "layout-dashboard",
    title: "Dashboard",
    navKey: "dashboard",
    description: "Your at-a-glance overview of everything happening in cAMP right now.",
    whatItDoes: [
      "Real-time stats: registrations, check-ins, surveys, XP",
      "XP leader + leading team spotlight",
      "Quick action buttons to jump to common tasks",
    ],
    impact: "View-only — nothing here changes the app. Safe to explore anytime.",
  },
  {
    icon: "users",
    title: "cAMPers",
    navKey: "campers",
    description: "Your roster of all registered cAMPers. Click any name for their full progress card.",
    whatItDoes: [
      "View every camper's XP, check-ins, prework, and survey status",
      "Search and filter by name, role, or region",
      "Click into a cAMPer Card — the shareable progress report for managers",
      "Award bonus XP directly from a camper's detail view",
      "Add private counselor notes (visible to managers, NOT the camper)",
    ],
    impact: "Awarding XP changes their points immediately. Notes are published to the manager portal in real-time.",
    tip: "Use the cAMPer Card as your go-to when a manager asks 'How is my new hire doing?'",
  },
  {
    icon: "flag",
    title: "Teams",
    navKey: "teams",
    description: "Create and manage teams, assign campers, and set up company assignments for EBRs.",
    whatItDoes: [
      "Auto-generate balanced teams by region + role",
      "Manually assign campers to teams",
      "Assign a customer/company to each team for presentations",
      "View team XP standings",
    ],
    impact: "Changing team assignments moves campers immediately. Company assignments affect what teams see in their workspace.",
  },
  {
    icon: "calendar",
    title: "Agenda",
    navKey: "schedule",
    description: "Build the daily schedule from the session bank. Drag sessions onto the calendar.",
    whatItDoes: [
      "Create and manage sessions in the session bank",
      "Drag & drop sessions onto the daily schedule",
      "Set times, rooms, and categories for each session",
      "The schedule updates live — campers see changes instantly on their Agenda tab",
    ],
    impact: "Changes are live immediately. Moving or removing a session updates the camper-facing agenda in real-time.",
    tip: "Build the full week's agenda before cAMP starts. You can always adjust during the week.",
  },
  {
    icon: "target",
    title: "Presentations & Activities",
    navKey: "presentations",
    description: "Manage all interactive activities: presentations, bingo, hackathon, workshops.",
    whatItDoes: [
      "Lock/unlock activities (locked = 'Coming Soon' overlay for campers)",
      "Edit presentation content, instructions, and resources",
      "View rubric scores and team submissions",
      "Activities appear on the Presentations tab for campers",
    ],
    impact: "Unlocking an activity makes it immediately accessible. Editing content updates what campers see in real-time.",
    tip: "Keep activities locked until you're ready. Unlock them as you go through the week for a 'reveal' effect.",
  },
  {
    icon: "lock",
    title: "Feature Gates",
    navKey: "gates",
    description: "Control which sections of the app are visible to campers.",
    whatItDoes: [
      "Toggle gates on/off for major app sections (Teams, Cohort, Presentations, etc.)",
      "Locked sections show a 'coming soon' message to campers",
      "Counselors/admins always bypass gates automatically",
    ],
    impact: "Toggling a gate instantly shows/hides that section for all campers. Use this to phase the experience.",
    tip: "Start with most gates locked. Open them progressively as cAMP unfolds.",
  },
  {
    icon: "bar-chart-3",
    title: "Analytics & Surveys",
    navKey: "analytics",
    description: "Survey results, manager engagement, and downloadable reports.",
    whatItDoes: [
      "View daily survey results with averages and breakdowns",
      "See which managers have registered and when they last engaged",
      "Export survey data as CSV for stakeholder reports",
      "Track manager comments and engagement with their new hires",
    ],
    impact: "View-only — nothing here changes the app.",
  },
  {
    icon: "tent",
    title: "Counselor Cabin",
    navKey: "cabin",
    description: "Your personal counselor profile and team settings.",
    whatItDoes: [
      "Edit your counselor profile (photo, bio, fun facts, work history)",
      "Toggle counselor visibility per cohort",
      "Your profile appears on the Cohort tab for campers to see",
    ],
    impact: "Profile changes appear on the camper-facing Cohort tab immediately.",
  },
  {
    icon: "archive",
    title: "Cohort Management",
    navKey: "cohort",
    description: "Create new cohorts, add campers, and archive completed cohorts.",
    whatItDoes: [
      "Add campers with names, roles, regions, and managers",
      "Create a new cohort (resets the app for the next group)",
      "Archive the current cohort (stores history in Past cAMPs)",
      "Switch between cohorts to review past data",
    ],
    impact: "Creating a new cohort resets the active experience. Always archive first!",
    tip: "Archive → Create New → Add Campers → Set up Agenda → Open gates. That's the lifecycle.",
  },
];

export default function LayOfTheLand({ onNavigate }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          📖 Lay of the Land
        </h2>
        <p className="text-blue-100 mt-2 text-sm leading-relaxed">
          Welcome, counselor! This guide walks you through every section of Mission Control —
          what it does, what happens when you change things, and tips for running a smooth cAMP.
          Click any section to learn more, or tap "Go There" to jump right in.
        </p>
      </div>

      {/* Before You Begin */}
      <Card className="p-5 border-l-4 border-l-amber-400">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
          ⚡ Before You Begin — Quick Checklist
        </h3>
        <div className="space-y-1.5">
          {[
            "Set up your Counselor Profile (Cabin)",
            "Create or confirm the active cohort (Cohort Management)",
            "Add all cAMPers with their names, roles, regions, and managers",
            "Build the agenda from the session bank (Agenda)",
            "Load presentations and lock them until go-time (Presentations)",
            "Set feature gates — start locked, open as you go (Feature Gates)",
            "Generate and assign teams (Teams)",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="text-muted-foreground font-mono text-xs mt-0.5">{i + 1}.</span>
              {item}
            </div>
          ))}
        </div>
      </Card>

      {/* Section guide */}
      <div className="space-y-3">
        {SECTIONS.map((section, i) => {
          const isOpen = expandedIndex === i;
          return (
            <Card key={section.navKey} className="overflow-hidden">
              <button
                onClick={() => setExpandedIndex(isOpen ? null : i)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon icon={section.icon} className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
                <Icon icon={isOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-3">
                  {/* What it does */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">What You Can Do</p>
                    <ul className="space-y-1">
                      {section.whatItDoes.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                          <Icon icon="check" className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Impact */}
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <Icon icon="alert-triangle" className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Impact</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">{section.impact}</p>
                    </div>
                  </div>

                  {/* Tip */}
                  {section.tip && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <Icon icon="lightbulb" className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">{section.tip}</p>
                    </div>
                  )}

                  {/* Go there button */}
                  <button
                    onClick={() => onNavigate(section.navKey)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Go to {section.title}
                    <Icon icon="arrow-right" className="w-3 h-3" />
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
