import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type HireStatus = "pending" | "invited" | "accepted" | "declined";
const STATUS_COLORS: Record<HireStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  invited: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

type Props = {
  cohortId: number;
  camperId: number;
};

export default function NewHireManager({ cohortId, camperId }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const { data, loading, fetching, refetch } = useApiData("GetNewHires", {
    cohort_id: cohortId,
    status: statusFilter === "all" ? null : statusFilter,
  });
  const { run: uploadList, loading: uploading } = useApi("UploadNewHireList");
  const { run: updateStatus, loading: updating } = useApi("UpdateNewHireStatus");
  const { run: migrate } = useApi("MigrateNewHires");

  const hires = (data?.hires ?? []) as any[];
  const total = data?.total ?? 0;

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { toast.error("CSV must have a header + at least 1 row"); return; }

    // Parse header to find columns
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    const firstIdx = header.findIndex((h) => h.includes("first"));
    const lastIdx = header.findIndex((h) => h.includes("last"));
    const emailIdx = header.findIndex((h) => h.includes("email"));
    const roleIdx = header.findIndex((h) => h.includes("role") || h.includes("title"));
    const regionIdx = header.findIndex((h) => h.includes("region") || h.includes("location"));
    const mgrNameIdx = header.findIndex((h) => h.includes("manager") && !h.includes("email"));
    const mgrEmailIdx = header.findIndex((h) => h.includes("manager") && h.includes("email"));

    if (emailIdx === -1) { toast.error("CSV must have an email column"); return; }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        first_name: firstIdx >= 0 ? cols[firstIdx] ?? "" : "",
        last_name: lastIdx >= 0 ? cols[lastIdx] ?? "" : "",
        email: cols[emailIdx] ?? "",
        role_title: roleIdx >= 0 ? cols[roleIdx] ?? null : null,
        region: regionIdx >= 0 ? cols[regionIdx] ?? null : null,
        manager_name: mgrNameIdx >= 0 ? cols[mgrNameIdx] ?? null : null,
        manager_email: mgrEmailIdx >= 0 ? cols[mgrEmailIdx] ?? null : null,
      };
    }).filter((r) => r.email);

    try {
      // Ensure table exists
      await migrate({});
      const result = await uploadList({ csv_rows: rows, uploaded_by: camperId, cohort_id: cohortId });
      toast.success(`Uploaded: ${result?.inserted ?? 0} new hires, ${result?.skipped ?? 0} skipped`);
      refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Upload failed: " + msg);
    }
    if (fileRef.current) fileRef.current.value = "";
  }, [camperId, cohortId, migrate, uploadList, refetch]);

  const handleStatusChange = useCallback(async (hireId: number, newStatus: string) => {
    try {
      await updateStatus({ hire_id: hireId, status: newStatus, cohort_id: cohortId });
      toast.success(`Status updated to ${newStatus}`);
      refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [updateStatus, cohortId, refetch]);

  const counts = {
    all: total,
    pending: hires.filter((h: any) => h.status === "pending").length,
    invited: hires.filter((h: any) => h.status === "invited").length,
    accepted: hires.filter((h: any) => h.status === "accepted").length,
    declined: hires.filter((h: any) => h.status === "declined").length,
  };

  return (
    <div className="space-y-4">
      {/* Upload + filter bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm" className="bg-camp-green hover:bg-camp-green/90 text-white">
            <Icon icon="upload" className="w-4 h-4 mr-1.5" />
            {uploading ? "Uploading..." : "Upload CSV"}
          </Button>
          <p className="text-xs text-muted-foreground">
            CSV with columns: First Name, Last Name, Email, Role/Title, Region, Manager Name, Manager Email
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all})</SelectItem>
            <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
            <SelectItem value="invited">Invited ({counts.invited})</SelectItem>
            <SelectItem value="accepted">Accepted ({counts.accepted})</SelectItem>
            <SelectItem value="declined">Declined ({counts.declined})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hire list */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : hires.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon icon="users" className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No new hires uploaded yet. Download your Google Sheet as CSV and upload it here.
          </p>
        </Card>
      ) : (
        <div className={`space-y-1.5 ${fetching ? "opacity-70" : ""}`}>
          {hires.map((hire: any) => (
            <Card key={hire.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{hire.first_name} {hire.last_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[hire.status as HireStatus]}`}>
                    {hire.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{hire.email}</span>
                  {hire.role_title && <span className="flex items-center gap-1"><Icon icon="briefcase" className="w-3 h-3" />{hire.role_title}</span>}
                  {hire.region && <span className="flex items-center gap-1"><Icon icon="map-pin" className="w-3 h-3" />{hire.region}</span>}
                  {hire.manager_name && <span className="flex items-center gap-1"><Icon icon="user" className="w-3 h-3" />{hire.manager_name}</span>}
                </div>
              </div>
              <Select value={hire.status} onValueChange={(v) => handleStatusChange(hire.id, v)} disabled={updating}>
                <SelectTrigger className="w-28 text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
