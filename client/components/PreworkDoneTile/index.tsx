import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  title: string;
  subtitle?: string;
  flagged?: boolean;
  children?: ReactNode;
};

/** Shared "done" frame for the special pre-work tiles (Challenger, Wheel & Deal, Share). */
export default function PreworkDoneTile({ title, subtitle, flagged, children }: Props) {
  return (
    <div className="p-4 rounded-lg border bg-camp-green/5 border-camp-green/20 space-y-3">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-camp-green text-white flex items-center justify-center">
          <Icon icon="check" className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-camp-green">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {flagged && (
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <Icon icon="alert-triangle" className="w-3.5 h-3.5" />
              Flagged for counselor review
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-xs text-camp-green font-medium flex items-center gap-1">
          <Icon icon="check-circle" className="w-4 h-4" />
          Done
        </div>
      </div>
      {children && <div className="pl-12">{children}</div>}
    </div>
  );
}
