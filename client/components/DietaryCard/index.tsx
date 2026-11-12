import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { DIETARY_OPTIONS } from "@/lib/dietary.js";

type Props = {
  savedOptions: string[] | null | undefined;
  savedNotes: string | null | undefined;
  onSaved: () => void;
};

const GROUPS = ["Diet", "Allergy", "Religious / cultural", "Other"] as const;

/** Optional dietary considerations. Saved on its own; not part of profile completion or pre-work. */
export default function DietaryCard({ savedOptions, savedNotes, onSaved }: Props) {
  const { run: save, loading: saving } = useApi("UpdateDietary");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setSelected(savedOptions ?? []);
    setNotes(savedNotes ?? "");
  }, [savedOptions, savedNotes]);

  const dirty = useMemo(() => {
    const a = [...selected].sort().join(",");
    const b = [...(savedOptions ?? [])].sort().join(",");
    return a !== b || notes.trim() !== (savedNotes ?? "").trim();
  }, [selected, notes, savedOptions, savedNotes]);

  const toggle = (value: string) =>
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const handleSave = async () => {
    try {
      await save({ options: selected as never, notes: notes.trim() || null });
      toast.success("Dietary considerations saved");
      onSaved();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Couldn't save: " + message);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon icon="utensils" className="w-5 h-5 text-camp-green" />
          Dietary Considerations
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Optional</span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Share any restrictions, allergies, or religious or cultural needs so we can plan meals and snacks. Only
        counselors can see this.
      </p>

      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY_OPTIONS.filter((o) => o.group === group).map((o) => {
                const on = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      on
                        ? "border-camp-green bg-camp-green/10 text-camp-green"
                        : "border-border bg-background text-foreground hover:border-camp-green/40"
                    }`}
                  >
                    {on && <Icon icon="check" className="h-3 w-3" />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dietaryNotes" className="text-xs">Details (optional)</Label>
          <Textarea
            id="dietaryNotes"
            placeholder="e.g. severe peanut allergy, I carry an EpiPen; no alcohol; fasting during Ramadan…"
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[70px]"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !dirty} variant="outline">
            {saving ? "Saving…" : "Save dietary info"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
