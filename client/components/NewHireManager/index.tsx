import { useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import NewHireRow, { HIRE_STATUSES, normalizeStatus, type HireStatus } from "@/components/NewHireRow/index.js";

type Props = {
  cohortId: number;
  camperId: number;
};

export default function NewHireManager({ cohortId, camperId }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  // Load the whole cohort once and filter here, so the filter counts stay accurate.
  const { data, loading, fetching, refetch } = useApiData("GetNewHires", {
    cohort_id: cohortId,
    status: null,
  });
  const { run: uploadList, loading: uploading } = useApi("UploadNewHireList");
  const { run: updateStatus, loading: updating } = useApi("UpdateNewHireStatus");
  const { run: migrate } = useApi("MigrateNewHires");

  const allHires = (data?.hires ?? []) as any[];
  const hires = useMemo(
    () => (statusFilter === "all" ? allHires : allHires.filter((h) => normalizeStatus(h.status) === statusFilter)),
    [allHires, statusFilter]
  );

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
    const regionIdx = header.findIndex((h) => h.includes("region"));
    const countryIdx = header.findIndex((h) => h.includes("country") || h.includes("location"));
    const startDateIdx = header.findIndex((h) => h.includes("start") && h.includes("date"));
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
        country: countryIdx >= 0 ? cols[countryIdx] ?? null : null,
        start_date: startDateIdx >= 0 ? cols[startDateIdx] ?? null : null,
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

  const handleStatusChange = useCallback(async (hireId: number, newStatus: HireStatus) => {
    try {
      await updateStatus({ hire_id: hireId, status: newStatus, cohort_id: cohortId });
      toast.success(`Status updated to ${newStatus}`);
      refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [updateStatus, cohortId, refetch]);

  const counts = useMemo(() => {
    const c: Record<"all" | HireStatus, number> = { all: allHires.length, invited: 0, accepted: 0, declined: 0 };
    for (const h of allHires) c[normalizeStatus(h.status)]++;
    return c;
  }, [allHires]);

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
            CSV with columns: First Name, Last Name, Email, Role/Title, Country/Location, Start Date, Manager Name, Manager Email
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all})</SelectItem>
            {HIRE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label} ({counts[s.value]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hire list */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : allHires.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon icon="users" className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No new hires uploaded yet. Download your Google Sheet as CSV and upload it here.
          </p>
        </Card>
      ) : hires.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No one with this status.</p>
      ) : (
        <div className={`flex flex-col gap-2 ${fetching ? "opacity-70" : ""}`}>
          {hires.map((hire: any) => (
            <NewHireRow key={hire.id} hire={hire} disabled={updating} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
