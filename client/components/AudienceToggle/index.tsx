import { Icon } from "@/components/ui/icon";
import type { Visibility } from "@/lib/managerThreads";

type Props = {
  value: Visibility;
  onChange: (v: Visibility) => void;
  camperFirstName: string;
};

const OPTIONS: { value: Visibility; label: (name: string) => string; hint: (name: string) => string; icon: "eye" | "lock" }[] = [
  {
    value: "camper",
    label: (n) => `Share with ${n}`,
    hint: (n) => `${n} sees this on their profile and can reply. Counselors can see it too.`,
    icon: "eye",
  },
  {
    value: "counselor",
    label: () => "Counselors only",
    hint: (n) => `Private note to the cAMP counselors. ${n} never sees it.`,
    icon: "lock",
  },
];

/** Manager picks who a note is for: the cAMPer, or counselors only. */
export default function AudienceToggle({ value, onChange, camperFirstName }: Props) {
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  return (
    <div className="space-y-1">
      <div className="inline-flex rounded-lg border border-border bg-background p-0.5" role="radiogroup" aria-label="Who sees this">
        {OPTIONS.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? o.value === "counselor" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon icon={o.icon} className="w-3.5 h-3.5" />
              {o.label(camperFirstName)}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">{current.hint(camperFirstName)}</p>
    </div>
  );
}
