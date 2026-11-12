import { Switch } from "@/components/ui/switch";
import { Icon } from "@/components/ui/icon";
import { STANDARD_ROLES } from "@/lib/roles.js";

export type BlackoutValue = { isBlackout: boolean; roles: string[] };

type Props = {
  value: BlackoutValue;
  onChange: (next: BlackoutValue) => void;
  /** Smaller text for the Session Bank side panel. */
  compact?: boolean;
  hint?: string;
};

/**
 * "Required (blackout)" switch plus who it applies to. No roles picked = every role.
 * cAMPers in the chosen roles can't request an absence that overlaps the session.
 */
export default function BlackoutSettings({ value, onChange, compact = false, hint }: Props) {
  const everyone = value.roles.length === 0;
  const toggleRole = (role: string) => {
    const has = value.roles.includes(role);
    const next = has ? value.roles.filter((r) => r !== role) : [...value.roles, role];
    // Picking every role is the same as Everyone.
    onChange({ ...value, roles: next.length >= STANDARD_ROLES.length ? [] : next });
  };
  const chip = compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";

  return (
    <div className={`rounded-lg border ${value.isBlackout ? "border-red-200 bg-red-50/60" : "border-border bg-muted/30"} ${compact ? "p-2" : "p-3"}`}>
      <label className="flex cursor-pointer items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Icon icon="shield-alert" className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} ${value.isBlackout ? "text-red-600" : "text-muted-foreground"}`} />
          <span className={`${compact ? "text-xs" : "text-sm"} font-medium text-foreground`}>Required (blackout)</span>
        </span>
        <Switch checked={value.isBlackout} onCheckedChange={(checked) => onChange({ ...value, isBlackout: checked })} />
      </label>
      <p className={`mt-1 text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
        {hint ?? "cAMPers can't request an absence during this session."}
      </p>

      {value.isBlackout && (
        <div className="mt-2">
          <p className={`mb-1 font-medium text-foreground ${compact ? "text-[10px]" : "text-xs"}`}>Who is it required for?</p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onChange({ ...value, roles: [] })}
              className={`rounded-full border font-medium transition-colors ${chip} ${
                everyone ? "border-red-400 bg-red-600 text-white" : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Everyone
            </button>
            {STANDARD_ROLES.map((role) => {
              const on = value.roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  aria-pressed={on}
                  className={`rounded-full border font-medium transition-colors ${chip} ${
                    on ? "border-red-400 bg-red-100 text-red-800" : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
          {!everyone && (
            <p className={`mt-1 text-muted-foreground ${compact ? "text-[10px]" : "text-[11px]"}`}>
              Required for {value.roles.length} role{value.roles.length === 1 ? "" : "s"}. Other roles can still request time off.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** True when two blackout settings are the same (role order ignored). */
export function sameBlackout(a: BlackoutValue, b: BlackoutValue): boolean {
  if (a.isBlackout !== b.isBlackout) return false;
  if (!a.isBlackout) return true;
  const ar = [...a.roles].sort().join("|");
  const br = [...b.roles].sort().join("|");
  return ar === br;
}
