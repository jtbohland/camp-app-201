import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountryPicker from "@/components/CountryPicker/index.js";
import { useApi } from "@/hooks/useApi";
import { STANDARD_ROLES, ROLE_HINTS, mapToStandardRole } from "@/lib/roles.js";

type Props = {
  open: boolean;
  cohortId: number;
  onClose: () => void;
  onAdded: () => void;
};

type Form = {
  first_name: string;
  last_name: string;
  email: string;
  official_title: string;
  role: string;
  country: string;
  start_date: string;
  manager_name: string;
  manager_email: string;
};

const EMPTY: Form = {
  first_name: "", last_name: "", email: "", official_title: "", role: "",
  country: "", start_date: "", manager_name: "", manager_email: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMessage(err: unknown) {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

function Field({ id, label, children, full }: { id?: string; label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "col-span-2" : "col-span-2 sm:col-span-1"}`}>
      <Label htmlFor={id} className="text-xs">
        {label} <span className="text-destructive">*</span>
      </Label>
      {children}
    </div>
  );
}

/** Manually add one cAMPer to Cohort Management, with every field a CSV row has. */
export default function AddNewHireDialog({ open, cohortId, onClose, onAdded }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [roleTouched, setRoleTouched] = useState(false);
  const { run: addHire, loading: saving } = useApi("AddNewHire");

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setRoleTouched(false);
    }
  }, [open]);

  const set = useCallback((key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value })), []);

  // Suggest the cAMP role from the official title until the counselor picks one.
  const onTitleChange = useCallback(
    (value: string) => {
      setForm((f) => ({ ...f, official_title: value, role: roleTouched ? f.role : mapToStandardRole(value) ?? "" }));
    },
    [roleTouched]
  );

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!form.first_name.trim()) m.push("first name");
    if (!form.last_name.trim()) m.push("last name");
    if (!EMAIL_RE.test(form.email.trim())) m.push("email");
    if (!form.official_title.trim()) m.push("official title");
    if (!form.role) m.push("cAMP role");
    if (!form.country) m.push("country");
    if (!form.start_date) m.push("start date");
    if (!form.manager_name.trim()) m.push("manager name");
    if (!EMAIL_RE.test(form.manager_email.trim())) m.push("manager email");
    return m;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    try {
      const res = await addHire({ cohort_id: cohortId, ...form });
      if (!res?.success) {
        toast.error(res?.message ?? "Could not add this cAMPer.");
        return;
      }
      toast.success(res.message);
      onAdded();
      onClose();
    } catch (err) {
      toast.error("Add failed: " + errorMessage(err));
    }
  }, [missing, addHire, cohortId, form, onAdded, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a cAMPer</DialogTitle>
          <DialogDescription>
            Same details as a CSV row. They're added as <b>Invited</b> and their registration is pre-filled.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <Field id="add-first" label="First name">
            <Input id="add-first" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} autoFocus />
          </Field>
          <Field id="add-last" label="Last name">
            <Input id="add-last" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </Field>
          <Field id="add-email" label="Email" full>
            <Input
              id="add-email"
              type="email"
              placeholder="firstname.lastname@amplitude.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field id="add-title" label="Role / Title (official)" full>
            <Input
              id="add-title"
              placeholder="e.g. Major Enterprise Account Executive"
              value={form.official_title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </Field>
          <Field label="cAMP role (abbreviated)">
            <Select
              value={form.role}
              onValueChange={(v) => {
                setRoleTouched(true);
                set("role", v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a role" />
              </SelectTrigger>
              <SelectContent>
                {STANDARD_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                    {ROLE_HINTS[r] && <span className="ml-2 text-xs text-muted-foreground">{ROLE_HINTS[r]}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="add-country" label="Country / Location">
            <CountryPicker id="add-country" value={form.country} onChange={(v) => set("country", v)} placeholder="Country" />
          </Field>
          <Field id="add-start" label="Start date">
            <Input id="add-start" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </Field>
          <Field id="add-mgr" label="Manager name">
            <Input id="add-mgr" value={form.manager_name} onChange={(e) => set("manager_name", e.target.value)} />
          </Field>
          <Field id="add-mgr-email" label="Manager email" full>
            <Input
              id="add-mgr-email"
              type="email"
              placeholder="manager@amplitude.com"
              value={form.manager_email}
              onChange={(e) => set("manager_email", e.target.value)}
            />
          </Field>
          <button type="submit" className="hidden" />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-camp-green hover:bg-camp-green/90 text-white">
            {saving ? "Adding..." : "Add cAMPer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
