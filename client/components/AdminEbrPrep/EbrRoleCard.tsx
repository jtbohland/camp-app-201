import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";
import EbrScriptView, { type EbrScript } from "./EbrScriptView.js";

export type EbrRole = {
  presentation_id: number;
  presentation_title: string;
  team_id: number;
  team_name: string;
  team_color: string | null;
  team_logo: string | null;
  company_name: string;
  industry: string | null;
  counselor_id: number;
  counselor_name: string;
  executive_role: string;
  notes: string | null;
  script: EbrScript | null;
  script_generated_at: string | null;
};

type Props = {
  role: EbrRole;
  isMine: boolean;
  generating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
};

/** One counselor's role in one team's EBR, with its prep script. */
export default function EbrRoleCard({ role, isMine, generating, canGenerate, onGenerate }: Props) {
  const [open, setOpen] = useState(isMine && !!role.script);
  const hasScript = !!role.script;
  const count = role.script?.sections.reduce((s, x) => s + x.questions.length, 0) ?? 0;

  return (
    <Card className={`p-4 ${isMine ? "border-amber-300 bg-amber-50/30" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <TeamLogoBadge src={role.team_logo} name={role.team_name} color={role.team_color} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{role.counselor_name}</span>
              {isMine && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">You</span>}
            </div>
            <p className="text-sm font-semibold text-amber-700">
              {role.executive_role}
              {role.company_name && <span className="font-normal text-muted-foreground"> at {role.company_name}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              Presented by <span className="font-medium text-foreground">{role.team_name}</span>
              {role.industry ? ` · ${role.industry}` : ""}
            </p>
            {role.notes && (
              <p className="mt-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                <span className="font-medium">Team's briefing notes:</span> {role.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasScript && (
            <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
              <Icon icon={open ? "chevron-up" : "chevron-down"} className="mr-1 h-3.5 w-3.5" />
              {open ? "Hide script" : `View script (${count} questions)`}
            </Button>
          )}
          {canGenerate && (
            <Button
              size="sm"
              variant={hasScript ? "ghost" : "default"}
              onClick={() => { setOpen(true); onGenerate(); }}
              disabled={generating}
              title={hasScript ? "Write a fresh script from the team's latest materials" : undefined}
            >
              <Icon icon={generating ? "loader-2" : hasScript ? "refresh-cw" : "sparkles"} className={`mr-1 h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Writing…" : hasScript ? "Regenerate" : "Generate script"}
            </Button>
          )}
        </div>
      </div>

      {generating && !hasScript && (
        <p className="mt-3 text-xs text-muted-foreground">Reading the team's role notes and EBR materials… this takes about 15 seconds.</p>
      )}
      {open && role.script && (
        <div className={`mt-4 border-t border-border pt-4 ${generating ? "opacity-70" : ""}`}>
          <EbrScriptView script={role.script} />
          {role.script_generated_at && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Generated {new Date(role.script_generated_at).toLocaleString()} · Regenerate after the team adds more materials.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
