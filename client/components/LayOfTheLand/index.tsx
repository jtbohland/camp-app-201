import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { GUIDE_SECTIONS } from "./sections.js";

type Props = {
  onNavigate: (section: string) => void;
};

/** The cohort lifecycle in the same order as the Hub sidebar. */
const CHECKLIST = [
  "Create or confirm the active cohort and upload new hires (Cohort Management)",
  "Check the roster as cAMPers register (cAMPers)",
  "Set the pre-work deadline and cAMP start date (Settings)",
  "Set up your counselor profile (Counselor Cabin)",
  "Review who's flying in and when they leave (Travel & Flights)",
  "Build the agenda from the session bank (Agenda)",
  "Load activities and keep them locked until go-time (Activities)",
  "Generate and assign teams (Teams)",
  "Open feature gates as the week unfolds (Feature Gates)",
  "Approve absences and watch survey results (Absences, Analytics)",
  "Close cAMP to award final badges and freeze points (Close cAMP)",
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
          Welcome, counselor! The Hub is laid out in the order you'll use it: set up the cohort, plan the week,
          run cAMP, then wrap up. Click any section to learn more, or tap "Go to" to jump right in.
        </p>
      </div>

      {/* Lifecycle checklist */}
      <Card className="p-5 border-l-4 border-l-amber-400">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
          ⚡ The cohort lifecycle, start to finish
        </h3>
        <div className="space-y-1.5">
          {CHECKLIST.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="text-muted-foreground font-mono text-xs mt-0.5">{i + 1}.</span>
              {item}
            </div>
          ))}
        </div>
      </Card>

      {/* Section guide, grouped by stage */}
      <div className="space-y-3">
        {GUIDE_SECTIONS.map((section, i) => {
          const isOpen = expandedIndex === i;
          const newStage = i === 0 || GUIDE_SECTIONS[i - 1].stage !== section.stage;
          return (
            <div key={section.navKey} className="space-y-3">
              {newStage && (
                <p className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.stage}
                </p>
              )}
              <Card className="overflow-hidden">
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

                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <Icon icon="alert-triangle" className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Impact</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">{section.impact}</p>
                      </div>
                    </div>

                    {section.tip && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <Icon icon="lightbulb" className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">{section.tip}</p>
                      </div>
                    )}

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
