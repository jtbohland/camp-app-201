import { useState, type ReactNode } from "react";
import AdminTeamMemberRow, { type AdminMember } from "@/components/AdminTeamMemberRow/index.js";

type Props = {
  header: ReactNode;
  members: AdminMember[];
  teams: { id: number; name: string }[];
  /** Team this table drops onto. Null is the Unassigned table. */
  dropTeamId: number | null;
  canEdit: boolean;
  emptyText: string;
  onOpen: (camperId: number) => void;
  onMove: (camperId: number, teamId: number | null) => void;
};

/** A team's cAMPers as a table (Name · Role · Country · Points · Move). Drop a row here to move it. */
export default function AdminTeamTable({ header, members, teams, dropTeamId, canEdit, emptyText, onOpen, onMove }: Props) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        if (!canEdit || !e.dataTransfer.types.includes("text/camper-id")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const id = Number(e.dataTransfer.getData("text/camper-id"));
        if (!canEdit || !id) return;
        e.preventDefault();
        if (members.some((m) => m.id === id)) return; // already here
        onMove(id, dropTeamId);
      }}
      className={`rounded-xl border bg-card p-5 shadow-sm transition-colors ${over ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40" : "border-border"}`}
    >
      {header}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-1.5 pl-2 font-medium">Name</th>
              <th className="pb-1.5 font-medium">Role</th>
              <th className="pb-1.5 font-medium">Country</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Points</th>
              {canEdit && <th className="pb-1.5 font-medium">Move to</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <AdminTeamMemberRow key={m.id} member={m} teams={teams} canEdit={canEdit} onOpen={onOpen} onMove={onMove} />
            ))}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <p className={`text-xs text-center py-4 rounded-lg mt-1 ${canEdit ? "border border-dashed border-border text-muted-foreground" : "text-muted-foreground"}`}>
          {emptyText}
        </p>
      )}
    </div>
  );
}
