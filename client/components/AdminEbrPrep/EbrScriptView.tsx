import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

export type ScriptQuestion = { question: string; type: "role" | "industry" | "challenger" | "engagement"; listen_for: string };
export type EbrScript = {
  brief: { who_you_are: string; who_youre_meeting: string; company_context: string; priorities: string[] };
  sections: { phase: string; timing: string; questions: ScriptQuestion[] }[];
};

const TYPE_STYLES: Record<ScriptQuestion["type"], { label: string; cls: string }> = {
  role: { label: "Role", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  industry: { label: "Industry", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  challenger: { label: "Challenger", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  engagement: { label: "Engagement", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

/** The prep script: who you are, who you're meeting, then questions in meeting order. */
export default function EbrScriptView({ script }: { script: EbrScript }) {
  const { brief } = script;
  let n = 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BriefBlock icon="user-round" title="Who you are" text={brief.who_you_are} />
        <BriefBlock icon="users" title="Who you're meeting" text={brief.who_youre_meeting} />
        <BriefBlock icon="building-2" title="Company context" text={brief.company_context} />
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon icon="target" className="h-3.5 w-3.5" /> What you care about
          </p>
          <ul className="space-y-1 text-sm text-foreground">
            {brief.priorities.map((p) => (
              <li key={p} className="flex gap-2"><span className="text-muted-foreground">•</span>{p}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        {script.sections.map((s) => (
          <div key={s.phase} className="rounded-lg border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <h5 className="text-sm font-semibold text-foreground">{s.phase}</h5>
              <span className="text-xs font-medium text-muted-foreground">{s.timing}</span>
            </div>
            <ol className="divide-y divide-border">
              {s.questions.map((q) => {
                n += 1;
                const t = TYPE_STYLES[q.type] ?? TYPE_STYLES.role;
                return (
                  <li key={q.question} className="flex gap-3 px-3 py-2.5">
                    <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">{n}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">"{q.question}"</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Listen for:</span> {q.listen_for}
                      </p>
                    </div>
                    <Badge variant="outline" className={`h-fit shrink-0 text-[10px] ${t.cls}`}>{t.label}</Badge>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefBlock({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon icon={icon as "user-round"} className="h-3.5 w-3.5" /> {title}
      </p>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}
