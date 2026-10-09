import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

export type HireOption = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
};

type NewHirePickerProps = {
  campers: HireOption[];
  loading: boolean;
  excludeIds: number[];
  onPick: (camper: HireOption) => void;
  onCancel?: () => void;
};

/** Search + pick ONE new hire. Already-added hires are hidden. */
export default function NewHirePicker({ campers, loading, excludeIds, onPick, onCancel }: NewHirePickerProps) {
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campers
      .filter((c) => !excludeIds.includes(c.id))
      .filter((c) => !q || `${c.first_name} ${c.last_name} ${c.role} ${c.email}`.toLowerCase().includes(q));
  }, [campers, excludeIds, query]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by name, title, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        )}
      </div>

      <div className="max-h-48 overflow-y-auto rounded-md border divide-y bg-background">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading cAMPers...</div>
        ) : options.length === 0 ? (
          <div className="flex flex-col items-center gap-1 p-4 text-center">
            <Icon icon="user-search" className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {query ? `No cAMPers match "${query}"` : "No more cAMPers to add"}
            </p>
            <p className="text-xs text-muted-foreground">
              Your new hire hasn&apos;t registered yet — check back once they have.
            </p>
          </div>
        ) : (
          options.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
            >
              <Icon icon="user-plus" className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium truncate">{c.first_name} {c.last_name}</span>
                <span className="text-xs text-muted-foreground truncate">{c.role}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
