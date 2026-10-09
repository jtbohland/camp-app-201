import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";

export type EditableHire = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_title: string | null;
  region: string | null;
  manager_name: string | null;
  manager_email: string | null;
};

type Props = {
  hire: EditableHire | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = Omit<EditableHire, "id" | "role_title" | "region" | "manager_name" | "manager_email"> & {
  role_title: string;
  region: string;
  manager_name: string;
  manager_email: string;
};

const FIELDS: { key: keyof FormState; label: string; type?: string; required?: boolean; half?: boolean }[] = [
  { key: "first_name", label: "First name", required: true, half: true },
  { key: "last_name", label: "Last name", required: true, half: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "role_title", label: "Role / Title" },
  { key: "region", label: "Region" },
  { key: "manager_name", label: "Manager name", half: true },
  { key: "manager_email", label: "Manager email", type: "email", half: true },
];

function toForm(h: EditableHire): FormState {
  return {
    first_name: h.first_name ?? "",
    last_name: h.last_name ?? "",
    email: h.email ?? "",
    role_title: h.role_title ?? "",
    region: h.region ?? "",
    manager_name: h.manager_name ?? "",
    manager_email: h.manager_email ?? "",
  };
}

function errorMessage(err: unknown) {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

export default function EditNewHireDialog({ hire, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const { run: updateHire, loading: saving } = useApi("UpdateNewHire");

  useEffect(() => {
    setForm(hire ? toForm(hire) : null);
  }, [hire]);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }, []);

  const handleSave = useCallback(async () => {
    if (!hire || !form) return;
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error("First name, last name, and email are required.");
      return;
    }
    try {
      const res = await updateHire({
        hire_id: hire.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role_title: form.role_title || null,
        region: form.region || null,
        manager_name: form.manager_name || null,
        manager_email: form.manager_email || null,
      });
      if (!res?.success) {
        toast.error(res?.message ?? "Could not save changes.");
        return;
      }
      toast.success(`Updated ${form.first_name} ${form.last_name}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Save failed: " + errorMessage(err));
    }
  }, [hire, form, updateHire, onSaved, onClose]);

  return (
    <Dialog open={!!hire} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit new hire</DialogTitle>
          <DialogDescription>Fix details from the CSV without re-uploading.</DialogDescription>
        </DialogHeader>
        {form && (
          <form
            className="grid grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            {FIELDS.map((f) => (
              <div key={f.key} className={`flex flex-col gap-1.5 ${f.half ? "col-span-1" : "col-span-2"}`}>
                <Label htmlFor={`hire-${f.key}`} className="text-xs">
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id={`hire-${f.key}`}
                  type={f.type ?? "text"}
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              </div>
            ))}
            <button type="submit" className="hidden" />
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-camp-green hover:bg-camp-green/90 text-white">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
