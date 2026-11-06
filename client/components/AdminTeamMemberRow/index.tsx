import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRoleStyle } from "@/lib/roles.js";
import { getCountryDisplayName, getCountryStyle } from "@/lib/countryUtils.js";
import { UNASSIGNED } from "@/lib/teamMoves.js";

export type AdminMember = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  country: string | null;
  points: number;
  team_id: number | null;
};

type Props = {
  member: AdminMember;
  teams: { id: number; name: string }[];
  canEdit: boolean;
  onOpen: (camperId: number) => void;
  onMove: (camperId: number, teamId: number | null) => void;
};

/** One cAMPer in a Hub team table: name, role pill, country pill, points, and a Move control. */
function AdminTeamMemberRow({ member, teams, canEdit, onOpen, onMove }: Props) {
  const role = getRoleStyle(member.role);
  const country = getCountryStyle(member.country);
  const countryName = getCountryDisplayName(member.country) ?? member.country;

  return (
    <tr
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/camper-id", String(member.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group border-t border-border/60 hover:bg-muted/40 transition-colors"
    >
      <td className="py-2 pl-2 pr-2">
        <button
          type="button"
          onClick={() => onOpen(member.id)}
          className="flex items-center gap-2 text-left min-w-0"
        >
          {canEdit && (
            <Icon icon="grip-vertical" className="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab shrink-0" />
          )}
          <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-xs font-semibold text-emerald-700">
            {member.first_name[0]}{member.last_name[0]}
          </span>
          <span className="text-sm text-foreground truncate hover:underline">
            {member.first_name} {member.last_name}
          </span>
        </button>
      </td>
      <td className="py-2 pr-2">
        {role.text ? (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${role.pill}`}>
            {role.text}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 pr-2">
        {country ? (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${country.bg} ${country.text}`}>
            <span aria-hidden="true">{country.flag}</span>
            {countryName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 pr-2 text-right text-xs font-medium text-emerald-700 whitespace-nowrap">
        {member.points} pts
      </td>
      {canEdit && (
        <td className="py-2 pr-2 w-[132px]">
          <Select
            value={member.team_id === null ? UNASSIGNED : String(member.team_id)}
            onValueChange={(v) => onMove(member.id, v === UNASSIGNED ? null : Number(v))}
          >
            <SelectTrigger className="h-7 text-xs" aria-label={`Move ${member.first_name} to another team`}>
              <SelectValue placeholder="Move to…" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                  {t.name}
                </SelectItem>
              ))}
              <SelectItem value={UNASSIGNED} className="text-xs text-muted-foreground">
                Unassigned
              </SelectItem>
            </SelectContent>
          </Select>
        </td>
      )}
    </tr>
  );
}

export default memo(AdminTeamMemberRow);
