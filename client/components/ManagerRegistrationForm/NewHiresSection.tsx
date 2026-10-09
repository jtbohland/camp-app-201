import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import NewHirePicker, { type HireOption } from "./NewHirePicker";
import SelectedHireRow from "./SelectedHireRow";

type NewHiresSectionProps = {
  campers: HireOption[];
  loading: boolean;
  selected: HireOption[];
  onChange: (next: HireOption[]) => void;
};

/**
 * Step-by-step hire selection:
 * pick one → "Have another new hire attending cAMP?" → pick another … → Complete Registration.
 */
export default function NewHiresSection({ campers, loading, selected, onChange }: NewHiresSectionProps) {
  // Picker opens automatically until the first hire is chosen.
  const [adding, setAdding] = useState(false);
  const showPicker = selected.length === 0 || adding;
  const selectedIds = selected.map((h) => h.id);
  const remaining = campers.filter((c) => !selectedIds.includes(c.id)).length;

  const handlePick = (camper: HireOption) => {
    onChange([...selected, camper]);
    setAdding(false);
  };

  const handleRemove = (id: number) => {
    onChange(selected.filter((h) => h.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Your New Hire{selected.length > 1 ? "s" : ""} *</Label>
      <p className="text-xs text-muted-foreground">
        {selected.length === 0
          ? "Select the new hire you manage who's attending cAMP 201."
          : "Add everyone you manage who's attending. You need at least one."}
      </p>

      {selected.length > 0 && (
        <div className="flex flex-col gap-2">
          {selected.map((hire, i) => (
            <SelectedHireRow key={hire.id} index={i} hire={hire} onRemove={() => handleRemove(hire.id)} />
          ))}
        </div>
      )}

      {showPicker ? (
        <NewHirePicker
          campers={campers}
          loading={loading}
          excludeIds={selectedIds}
          onPick={handlePick}
          onCancel={selected.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
          <span className="text-sm text-foreground">Have another new hire attending cAMP?</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            disabled={remaining === 0}
          >
            <Icon icon="plus" className="w-4 h-4 mr-1" />
            Add another
          </Button>
        </div>
      )}
    </div>
  );
}
