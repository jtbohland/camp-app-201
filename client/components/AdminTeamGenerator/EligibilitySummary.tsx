import { useState } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  eligibleCount: number;
  acceptedCount: number;
  counselorCount: number;
  notOnList: { id: number; name: string }[];
  leftOut: { id: number; name: string; reason: string }[];
};

/** Shows who will be placed on teams, and who is left out and why. */
export default function EligibilitySummary({ eligibleCount, acceptedCount, counselorCount, notOnList, leftOut }: Props) {
  const [open, setOpen] = useState(false);
  const hasDetails = notOnList.length > 0 || leftOut.length > 0;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="font-semibold text-foreground">
          {eligibleCount} confirmed cAMPer{eligibleCount !== 1 ? "s" : ""} to place
        </span>
        {counselorCount > 0 && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Icon icon="shield-check" className="w-3.5 h-3.5" />
            {counselorCount} counselor{counselorCount !== 1 ? "s" : ""} left off teams
          </span>
        )}
        {leftOut.length > 0 && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Icon icon="user-x" className="w-3.5 h-3.5" />
            {leftOut.length} not Accepted
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {acceptedCount} Accepted in Cohort Management
        {notOnList.length > 0 && ` + ${notOnList.length} who signed up but aren't on the list`}.
        {hasDetails && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-2 font-medium text-foreground hover:underline inline-flex items-center gap-0.5"
          >
            {open ? "Hide details" : "See who"}
            <Icon icon={open ? "chevron-up" : "chevron-down"} className="w-3 h-3" />
          </button>
        )}
      </p>

      {open && hasDetails && (
        <div className="grid gap-3 sm:grid-cols-2 rounded-lg bg-muted/40 p-3">
          {notOnList.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Included: signed up, not on the list</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-auto">
                {notOnList.map((p) => <li key={p.id}>{p.name}</li>)}
              </ul>
            </div>
          )}
          {leftOut.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Left out</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-auto">
                {leftOut.map((p) => <li key={p.id}>{p.name} · {p.reason}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
