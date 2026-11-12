import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type ExpectedManager = {
  email: string;
  name: string | null;
  hires: string[];
  registered: boolean;
};

export type HireWithoutManager = { name: string; manager_name: string | null };

type Props = {
  expected: ExpectedManager[];
  hiresWithoutManager: HireWithoutManager[];
};

/**
 * Managers we expect to register (they manage a cAMPer marked Accepted in Cohort Management)
 * who haven't yet. Counselors can copy the emails to nudge them.
 */
export default function UnregisteredManagers({ expected, hiresWithoutManager }: Props) {
  const [showNoEmail, setShowNoEmail] = useState(false);
  const missing = useMemo(() => expected.filter((m) => !m.registered), [expected]);
  const registeredCount = expected.length - missing.length;

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(missing.map((m) => m.email).join(", "));
      toast.success(`Copied ${missing.length} manager email${missing.length !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Couldn't copy. Select the emails and copy them instead.");
    }
  };

  return (
    <Card className="bg-card border-border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Icon icon="user-x" className="h-4 w-4" />
            Managers Not Registered Yet
            <Badge className="border-amber-200 bg-amber-100 text-xs text-amber-800">{missing.length}</Badge>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Managers of cAMPers marked <span className="font-medium">Accepted</span> in Cohort Management.{" "}
            {expected.length > 0 && `${registeredCount} of ${expected.length} expected managers have registered.`}
          </p>
        </div>
        {missing.length > 0 && (
          <Button size="sm" variant="outline" onClick={copyEmails}>
            <Icon icon="copy" className="h-3.5 w-3.5" /> Copy emails
          </Button>
        )}
      </div>

      {expected.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No Accepted cAMPers with a manager email yet. Mark invites Accepted in Cohort Management to see who to expect.
        </div>
      ) : missing.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-camp-green">
          <Icon icon="circle-check" className="h-4 w-4" /> Every expected manager has registered.
        </div>
      ) : (
        <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
          {missing.map((m) => (
            <div key={m.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{m.name || m.email}</div>
                {m.name && <div className="text-xs text-muted-foreground">{m.email}</div>}
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {m.hires.map((h) => (
                  <Badge key={h} className="border-border bg-muted text-[11px] text-foreground/80">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hiresWithoutManager.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setShowNoEmail((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
          >
            <Icon icon={showNoEmail ? "chevron-down" : "chevron-right"} className="h-3.5 w-3.5" />
            {hiresWithoutManager.length} accepted cAMPer{hiresWithoutManager.length !== 1 ? "s have" : " has"} no manager email on file
          </button>
          {showNoEmail && (
            <ul className="mt-2 flex flex-col gap-1 pl-5 text-xs text-muted-foreground">
              {hiresWithoutManager.map((h) => (
                <li key={h.name}>
                  {h.name}
                  {h.manager_name ? ` (manager listed as ${h.manager_name}, no email)` : ""}
                </li>
              ))}
              <li className="mt-1 italic">Add their manager's email in Cohort Management to track them here.</li>
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
