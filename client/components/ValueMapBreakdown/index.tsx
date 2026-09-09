import { useState } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Value Map Breakdown / Guide
 * Talk tracks and strategies for uncovering customer business objectives & measures of success.
 * Rendered as an interactive reference card for the Value Discovery presentation.
 */

type Column = {
  key: string;
  label: string;
  icon: string;
  color: string;
};

const COLUMNS: Column[] = [
  { key: "value_driver", label: "Value Driver", icon: "🎯", color: "bg-blue-600" },
  { key: "objectives", label: "Business Objectives", icon: "📋", color: "bg-emerald-600" },
  { key: "success", label: "How Would You Measure Success?", icon: "📊", color: "bg-amber-600" },
  { key: "amplitude", label: "How Can Amplitude Help?", icon: "🚀", color: "bg-purple-600" },
];

type Row = {
  label: string;
  icon: string;
  bgClass: string;
  cells: Record<string, string | string[]>;
};

const ROWS: Row[] = [
  {
    label: "Definition",
    icon: "📖",
    bgClass: "bg-slate-50 dark:bg-slate-900/30",
    cells: {
      value_driver: "Acquisition / Retention / Monetization / Engagement",
      objectives: "What specific things is the customer looking to achieve in their business? What challenges are they facing? Why do they want to achieve this thing?",
      success: "Specific numbers or results we can measure to track success.",
      amplitude: "How should the customer use Amplitude to achieve these goals / or how are they already?",
    },
  },
  {
    label: "Talking Points & Discovery Questions",
    icon: "💬",
    bgClass: "bg-blue-50/50 dark:bg-blue-950/20",
    cells: {
      value_driver: [
        "**Choosing a Priority**",
        "Let's pick one or two value drivers to focus on today based on your current priorities.",
        "I did some research, and I thought *[insert value pillar]* might be a major priority because I know you *[...]*.",
        "But I'd love to know what is jumping off the page at you. What are you most excited about or focused on right now in your business?",
      ],
      objectives: [
        "**Digging In**",
        "When you think of your goals or initiatives associated with your *[value pillar]* — what is it that you're challenged with today?",
        "What would you like to resolve using data analytics so that you can actually drive more success?",
        "What would you like to solve?",
      ],
      success: [
        "**Defining Success**",
        "Help me understand how you are measuring this specific goal today. Or how you would like to in the future?",
        "What would indicate that you have been successful at supporting this initiative?",
      ],
      amplitude: [
        "**Tying to Amplitude**",
        "Tell me what you're doing in Amplitude today to support these goals.",
        "Share your ideas for what they could be doing.",
      ],
    },
  },
  {
    label: "Listen For",
    icon: "👂",
    bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
    cells: {
      value_driver: "**Priorities.** What do they choose? Are they all aligned as a team? Make note of things that were brought up but not chosen as the #1 priority.",
      objectives: "What is the **data** they are looking to collect and why? What **impact** is that making on their business?",
      success: "**Numbers** — dates, percentages, language such as \"how much\"",
      amplitude: "**Product features, functions, and terms** — any Amplitude workflows they describe whether they use them today or not",
    },
  },
  {
    label: "Do This",
    icon: "✅",
    bgClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
    cells: {
      value_driver: "List the Value Drivers in the order of priority",
      objectives: "**Try to collect at least 5** specific challenges or goals aligned to the Value Driver you're discussing and write them on the Value Map",
      success: "Write down everything you hear in the Value Map. Try to tie the hypothetical \"wins\" back to the larger impact they would have on the business.",
      amplitude: "Take notes in the Value Map",
    },
  },
  {
    label: "Example",
    icon: "🎥",
    bgClass: "bg-purple-50/50 dark:bg-purple-950/20",
    cells: {
      value_driver: "[Happn (1 min)](https://web.outreach.io/kaia/record/-DVds3e1RW-boFhL_Xry2Q) — start min 12:30",
      objectives: "[PGA (2 mins)](https://web.outreach.io/kaia/record/KgBaPYdbTnm-RG_eKRCSOA) — start min 12:35",
      success: "[PGA (3 mins)](https://web.outreach.io/kaia/record/KgBaPYdbTnm-RG_eKRCSOA) — start min 16:30",
      amplitude: "[PGA](https://web.outreach.io/kaia/record/KgBaPYdbTnm-RG_eKRCSOA) — a lot discussed starting around min 26. Use cases as well as specific workflows that support.",
    },
  },
];

/** Parse simple markdown bold/italic/links into JSX */
function renderText(text: string) {
  // Split by markdown patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    // Bold
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    // Italic
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={i} className="italic text-muted-foreground">{part.slice(1, -1)}</em>;
    }
    // Link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function CellContent({ content }: { content: string | string[] }) {
  if (Array.isArray(content)) {
    return (
      <div className="space-y-1.5">
        {content.map((line, i) => (
          <p key={i} className="text-xs leading-relaxed">{renderText(line)}</p>
        ))}
      </div>
    );
  }
  return <p className="text-xs leading-relaxed">{renderText(content)}</p>;
}

export default function ValueMapBreakdown() {
  const [expandedRow, setExpandedRow] = useState<string | null>("Talking Points & Discovery Questions");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-lg">
          🗺️
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Value Map Breakdown / Guide</h3>
          <p className="text-xs text-muted-foreground">Talk tracks and strategies for uncovering your customer's business objectives & measures of success</p>
        </div>
      </div>

      {/* Column legend */}
      <div className="grid grid-cols-4 gap-2">
        {COLUMNS.map((col) => (
          <div key={col.key} className={`${col.color} rounded-lg px-3 py-2 text-white text-center`}>
            <span className="text-sm mr-1">{col.icon}</span>
            <span className="text-xs font-semibold">{col.label}</span>
          </div>
        ))}
      </div>

      {/* Accordion rows */}
      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
        {ROWS.map((row) => {
          const isOpen = expandedRow === row.label;
          return (
            <div key={row.label} className={row.bgClass}>
              <button
                onClick={() => setExpandedRow(isOpen ? null : row.label)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{row.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{row.label}</span>
                </div>
                <Icon
                  icon={isOpen ? "chevron-up" : "chevron-down"}
                  className="w-4 h-4 text-muted-foreground"
                />
              </button>

              {isOpen && (
                <div className="grid grid-cols-4 gap-px bg-border/50 mx-4 mb-4 rounded-lg overflow-hidden">
                  {COLUMNS.map((col) => (
                    <div key={col.key} className="bg-card p-3">
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-xs">{col.icon}</span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</span>
                      </div>
                      <CellContent content={row.cells[col.key]} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
