import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  number: number;
  title: string;
  description: string;
  done: boolean;
  children?: ReactNode;
};

/** One numbered row in the Cohort Management setup checklist. */
export default function CohortSetupStep({ number, title, description, done, children }: Props) {
  return (
    <div className="flex gap-4 py-4 border-b border-border last:border-b-0">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-foreground"
        }`}
      >
        {done ? <Icon icon="check" className="w-4 h-4" /> : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
