import type { IconName } from "lucide-react/dynamic";

export type GuideSection = {
  stage: string;
  icon: IconName;
  title: string;
  navKey: string;
  description: string;
  whatItDoes: string[];
  impact: string;
  tip?: string;
};

/** Same order and stages as the Hub sidebar: set up → plan the week → run cAMP → wrap up. */
export const GUIDE_SECTIONS: GuideSection[] = [
  {
    stage: "Overview",
    icon: "layout-dashboard",
    title: "Dashboard",
    navKey: "dashboard",
    description: "Your at-a-glance overview of everything happening in cAMP right now.",
    whatItDoes: [
      "Real-time stats: registrations, check-ins, surveys, XP",
      "XP leader + leading team spotlight",
      "Manager Messages inbox and quick actions",
    ],
    impact: "View-only — nothing here changes the app. Safe to explore anytime.",
  },
  {
    stage: "1 · Set Up",
    icon: "archive",
    title: "Cohort Management",
    navKey: "cohort",
    description: "Start here: create the cohort and load the new-hire list.",
    whatItDoes: [
      "Upload the new-hire CSV or add cAMPers one at a time",
      "Confirm roles, regions, and managers (the CSV is the source of truth)",
      "Create a new cohort (resets the app for the next group)",
      "Switch between cohorts to review past data",
    ],
    impact: "Creating a new cohort resets the active experience. Close the current cAMP first!",
    tip: "Close cAMP → Create New → Upload hires → Settings → Agenda → Gates. That's the lifecycle.",
  },
  {
    stage: "1 · Set Up",
    icon: "users",
    title: "cAMPers",
    navKey: "campers",
    description: "Your roster of all registered cAMPers. Click any name for their full progress card.",
    whatItDoes: [
      "View every cAMPer's XP, check-ins, pre-work, and survey status",
      "Search and filter by name, role, or region",
      "Click into a cAMPer Card — the shareable progress report for managers",
      "Award bonus XP directly from a cAMPer's detail view",
    ],
    impact: "Awarding XP changes their points immediately.",
    tip: "Use the cAMPer Card as your go-to when a manager asks 'How is my new hire doing?'",
  },
  {
    stage: "1 · Set Up",
    icon: "settings",
    title: "Settings",
    navKey: "settings",
    description: "Pre-work deadline, cAMP start date, early-bird bonus, and missed-deadline penalty.",
    whatItDoes: [
      "Set the pre-work deadline (cAMPers see a countdown)",
      "Set the cAMP start date — powers day numbering, the live agenda, and which check-ins count",
      "Tune early-bird bonus and missed-deadline penalty points",
    ],
    impact: "Changes apply to every cAMPer right away.",
    tip: "Set the cAMP start date before the first real check-in, or test check-ins may count.",
  },
  {
    stage: "1 · Set Up",
    icon: "tent",
    title: "Counselor Cabin",
    navKey: "cabin",
    description: "Your personal counselor profile and counselor rotation.",
    whatItDoes: [
      "Edit your counselor profile (photo, bio, fun facts, work history)",
      "Toggle counselor visibility per cohort",
      "Your profile appears on the Cohort tab for cAMPers to see",
    ],
    impact: "Profile changes appear on the cAMPer-facing Cohort tab immediately.",
  },
  {
    stage: "2 · Plan the Week",
    icon: "plane",
    title: "Travel & Flights",
    navKey: "flights",
    description: "Who's flying in, when they leave, and who's local.",
    whatItDoes: [
      "See every cAMPer's submitted flight details",
      "Spot who is local vs. flying in",
      "Plan around early departures",
    ],
    impact: "View-only — nothing here changes the app.",
  },
  {
    stage: "2 · Plan the Week",
    icon: "calendar",
    title: "Agenda",
    navKey: "schedule",
    description: "Build the daily schedule from the session bank. Drag sessions onto the calendar.",
    whatItDoes: [
      "Create and manage sessions in the session bank",
      "Drag & drop sessions onto the daily schedule",
      "Set times, rooms, and categories for each session",
    ],
    impact: "Changes are live immediately on the cAMPer-facing Agenda tab.",
    tip: "Build the full week's agenda before cAMP starts. You can always adjust during the week.",
  },
  {
    stage: "2 · Plan the Week",
    icon: "target",
    title: "Activities",
    navKey: "presentations",
    description: "Presentations, bingo, hackathon, and workshops.",
    whatItDoes: [
      "Lock/unlock activities (locked = 'Coming Soon' for cAMPers)",
      "Edit presentation content, instructions, and resources",
      "View rubric scores and team submissions",
    ],
    impact: "Unlocking an activity makes it immediately accessible to cAMPers.",
    tip: "Keep activities locked until you're ready. Unlock them during the week for a 'reveal' effect.",
  },
  {
    stage: "2 · Plan the Week",
    icon: "flag",
    title: "Teams",
    navKey: "teams",
    description: "Generate teams, assign cAMPers, and set up company assignments for EBRs.",
    whatItDoes: [
      "Auto-generate balanced teams by region + role",
      "Manually assign cAMPers to teams",
      "Assign a customer/company to each team for presentations",
      "View team XP standings",
    ],
    impact: "Changing team assignments moves cAMPers immediately.",
    tip: "Generate teams once registration is final, so nobody is left off a team.",
  },
  {
    stage: "3 · Run cAMP",
    icon: "lock",
    title: "Feature Gates",
    navKey: "gates",
    description: "Open sections of the app to cAMPers as the week unfolds.",
    whatItDoes: [
      "Toggle gates on/off for major app sections",
      "Locked sections show a 'coming soon' message to cAMPers",
      "Counselors always bypass gates automatically",
    ],
    impact: "Toggling a gate instantly shows/hides that section for all cAMPers.",
    tip: "Start with most gates locked. Open them progressively as cAMP unfolds.",
  },
  {
    stage: "3 · Run cAMP",
    icon: "calendar-x",
    title: "Absences",
    navKey: "absences",
    description: "Review and approve time-away requests during cAMP.",
    whatItDoes: [
      "Approve or decline absence requests",
      "See how many absences each cAMPer has used",
      "Approved absences are excused from team check-ins",
    ],
    impact: "Approving an absence excuses that cAMPer from check-ins during that window.",
  },
  {
    stage: "3 · Run cAMP",
    icon: "bar-chart-3",
    title: "Analytics & Surveys",
    navKey: "analytics",
    description: "Daily survey results, manager engagement, and downloadable reports.",
    whatItDoes: [
      "View daily survey results with averages and breakdowns",
      "See which managers have registered and engaged",
      "Export survey data as CSV for stakeholder reports",
    ],
    impact: "View-only — nothing here changes the app.",
  },
  {
    stage: "4 · Wrap Up",
    icon: "trophy",
    title: "Close cAMP",
    navKey: "close-camp",
    description: "End the cohort: award final badges and freeze points.",
    whatItDoes: [
      "Award attendance and milestone badges, Wheel Dealer, cAMP-V-P, cAMP Champ, Alpine Legend",
      "Freeze points and leaderboards for the cohort",
      "Save the results to Past cAMPs",
    ],
    impact: "Closing cAMP is final — points and badges can't change afterward.",
    tip: "Close cAMP before creating the next cohort in Cohort Management.",
  },
];
