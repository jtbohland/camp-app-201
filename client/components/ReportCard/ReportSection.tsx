import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

/** One titled section of the report card. */
export function ReportSection({
  icon,
  iconClass = "text-primary",
  title,
  aside,
  children,
  className = "",
}: {
  icon: IconName;
  iconClass?: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-5 break-inside-avoid ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon icon={icon} className={`h-4 w-4 ${iconClass}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {aside && <div className="ml-auto text-xs text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </Card>
  );
}

/** A big number with a label. */
export function ReportStat({ value, label, sub, tone = "text-foreground" }: { value: ReactNode; label: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-center">
      <p className={`text-xl font-extrabold ${tone}`}>{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/80">{sub}</p>}
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-3 text-center text-xs text-muted-foreground">{children}</p>;
}

export const fmtDate = (s: string | null | undefined, withTime = false) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, withTime ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" });
};
