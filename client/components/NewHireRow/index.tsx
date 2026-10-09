import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type HireStatus = "invited" | "accepted" | "declined";

export const HIRE_STATUSES: { value: HireStatus; label: string }[] = [
  { value: "invited", label: "Invited" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

/** Pill + dot colours: invited = yellow, accepted = green, declined = red. */
export const STATUS_STYLES: Record<HireStatus, { pill: string; dot: string }> = {
  invited: { pill: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  accepted: { pill: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  declined: { pill: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};

/** Older uploads may still say "pending"; treat them as invited. */
export function normalizeStatus(status: string): HireStatus {
  return status === "accepted" || status === "declined" ? status : "invited";
}

type Hire = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_title: string | null;
  region: string | null;
  manager_name: string | null;
  manager_email: string | null;
  status: string;
};

type Props = {
  hire: Hire;
  disabled: boolean;
  onStatusChange: (hireId: number, status: HireStatus) => void;
  onEdit: (hire: Hire) => void;
};

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}

function NewHireRow({ hire, disabled, onStatusChange, onEdit }: Props) {
  const status = normalizeStatus(hire.status);
  const style = STATUS_STYLES[status];

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40">
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {initials(hire.first_name, hire.last_name)}
      </div>

      {/* Name + details */}
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-foreground">
          {hire.first_name} {hire.last_name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="truncate">{hire.email}</span>
          {hire.role_title && (
            <span className="flex items-center gap-1">
              <Icon icon="briefcase" className="h-3 w-3" />
              {hire.role_title}
            </span>
          )}
          {hire.region && (
            <span className="flex items-center gap-1">
              <Icon icon="map-pin" className="h-3 w-3" />
              {hire.region}
            </span>
          )}
          {hire.manager_name && (
            <span className="flex items-center gap-1">
              <Icon icon="user" className="h-3 w-3" />
              {hire.manager_name}
            </span>
          )}
        </div>
      </div>

      {/* Edit details */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(hire)}
        aria-label={`Edit ${hire.first_name} ${hire.last_name}`}
        className="h-8 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Icon icon="pencil" className="h-3.5 w-3.5 mr-1" />
        Edit
      </Button>

      {/* Status: coloured pill that opens the menu */}
      <Select value={status} onValueChange={(v) => onStatusChange(hire.id, v as HireStatus)} disabled={disabled}>
        <SelectTrigger
          aria-label={`Status for ${hire.first_name} ${hire.last_name}`}
          className={`h-8 w-[118px] shrink-0 rounded-full border px-3 text-xs font-semibold ${style.pill}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {HIRE_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s.value].dot}`} />
                {s.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default memo(NewHireRow);
