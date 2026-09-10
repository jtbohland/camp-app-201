import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type Props = {
  presentationId: number;
  teamId: number;
  camperId: number;
};

export default function CounselorRoleAssignment({ presentationId, teamId, camperId }: Props) {
  const { data, loading, refetch } = useApiData("GetEBRRoleAssignments", {
    presentation_id: presentationId,
    team_id: teamId,
  });

  const { run: saveAssignment, loading: saving } = useApi("SaveEBRRoleAssignment");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ counselor_id: 0, company_name: "", executive_role: "", notes: "" });

  const assignments = data?.assignments ?? [];
  const counselors = data?.available_counselors ?? [];

  // Filter out already-assigned counselors for the "new" form
  const assignedIds = new Set(assignments.map((a: any) => a.counselor_id));
  const unassigned = counselors.filter((c: any) => !assignedIds.has(c.id));

  const handleEdit = useCallback((assignment: any) => {
    setEditing(assignment.counselor_id);
    setForm({
      counselor_id: assignment.counselor_id,
      company_name: assignment.company_name,
      executive_role: assignment.executive_role,
      notes: assignment.notes ?? "",
    });
  }, []);

  const handleNew = useCallback((counselorId: number) => {
    setEditing("new");
    setForm({ counselor_id: counselorId, company_name: "", executive_role: "", notes: "" });
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.counselor_id || !form.executive_role.trim()) {
      toast.error("Please select a role for this counselor");
      return;
    }
    try {
      await saveAssignment({
        presentation_id: presentationId,
        team_id: teamId,
        counselor_id: form.counselor_id,
        company_name: form.company_name,
        executive_role: form.executive_role,
        notes: form.notes || null,
        assigned_by: camperId,
      });
      toast.success("Role assigned!");
      setEditing(null);
      setForm({ counselor_id: 0, company_name: "", executive_role: "", notes: "" });
      refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed to save: " + msg);
    }
  }, [form, presentationId, teamId, camperId, saveAssignment, refetch]);

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Icon icon="theater" className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Counselor Role Play</h3>
          <p className="text-sm text-muted-foreground">
            Assign executive roles to counselors — they'll role-play during your EBR presentation
          </p>
        </div>
      </div>

      {/* Assigned counselors */}
      {assignments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assigned Roles</h4>
          {assignments.map((a: any) => (
            <Card key={a.id} className="p-4">
              {editing === a.counselor_id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-2">
                    <CounselorBadge name={a.counselor_name} photo={a.counselor_photo} />
                    <span className="font-medium text-sm">{a.counselor_name}</span>
                  </div>
                  <RoleForm form={form} setForm={setForm} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <CounselorBadge name={a.counselor_name} photo={a.counselor_photo} />
                    <div>
                      <div className="font-medium text-foreground">{a.counselor_name}</div>
                      <div className="text-sm text-amber-700 font-semibold mt-0.5">
                        {a.executive_role}
                        {a.company_name && <span className="text-muted-foreground font-normal"> at {a.company_name}</span>}
                      </div>
                      {a.notes && (
                        <p className="text-sm text-muted-foreground mt-1 bg-muted/50 rounded-md px-2 py-1">
                          📝 {a.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(a)}>
                    <Icon icon="pencil" className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Unassigned counselors */}
      {unassigned.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Available Counselors</h4>
          {unassigned.map((c: any) => (
            <Card key={c.id} className="p-4">
              {editing === "new" && form.counselor_id === c.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-2">
                    <CounselorBadge name={`${c.first_name} ${c.last_name}`} photo={c.photo_url} />
                    <span className="font-medium text-sm">{c.first_name} {c.last_name}</span>
                  </div>
                  <RoleForm form={form} setForm={setForm} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Assign Role"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CounselorBadge name={`${c.first_name} ${c.last_name}`} photo={c.photo_url} />
                    <div>
                      <div className="font-medium text-foreground">{c.first_name} {c.last_name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleNew(c.id)}>
                    <Icon icon="plus" className="w-3.5 h-3.5 mr-1" />
                    Assign Role
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {assignments.length === 0 && unassigned.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No counselors available for this cohort yet.</p>
        </Card>
      )}
    </div>
  );
}

function CounselorBadge({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-[#1b3a2d] text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
      {photo ? (
        <img src={photo} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

type FormState = { counselor_id: number; company_name: string; executive_role: string; notes: string };

function RoleForm({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const COMMON_ROLES = ["CEO", "CMO", "CTO", "VP Product", "VP Engineering", "VP Marketing", "Director of Analytics", "Director of Product", "Head of Growth"];

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Executive Role / Title *</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COMMON_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setForm({ ...form, executive_role: role })}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                form.executive_role === role
                  ? "bg-amber-100 border-amber-300 text-amber-800"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
        <Input
          placeholder="Or type a custom role..."
          value={form.executive_role}
          onChange={(e) => setForm({ ...form, executive_role: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Name</label>
        <Input
          placeholder="e.g. DoorDash, Coursera..."
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Briefing Notes (for the counselor to study)</label>
        <Textarea
          placeholder="Key priorities, concerns, personality traits, things the counselor should know to role-play this executive..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
