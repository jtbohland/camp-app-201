import { Icon } from "@/components/ui/icon";
import type { HireOption } from "./NewHirePicker";

type SelectedHireRowProps = {
  index: number;
  hire: HireOption;
  onRemove: () => void;
};

export default function SelectedHireRow({ index, hire, onRemove }: SelectedHireRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-blue-50/60 border-blue-200 px-3 py-2.5">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
        {index + 1}
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{hire.first_name} {hire.last_name}</span>
        <span className="text-xs text-muted-foreground truncate">{hire.role}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${hire.first_name} ${hire.last_name}`}
        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Icon icon="x" className="w-4 h-4" />
      </button>
    </div>
  );
}
