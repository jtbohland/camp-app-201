import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";

type SuggestedHiresCardProps = {
  /** Called after a cAMPer is added so the dashboard can refresh. */
  onAdded: () => void | Promise<void>;
};

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : String(error);
}

/** "X listed you as their manager" notifications with one-click add. Hidden when there are none. */
export default function SuggestedHiresCard({ onAdded }: SuggestedHiresCardProps) {
  const { data, refetch } = useApiData("GetSuggestedHires", {}, { staleTime: 15000 });
  const { run: addHire } = useApi("AddHireToManager");
  const [addingId, setAddingId] = useState<number | null>(null);

  const handleAdd = useCallback(
    async (camperId: number, name: string) => {
      setAddingId(camperId);
      try {
        await addHire({ camper_id: camperId });
        toast.success(`${name} added to your dashboard`);
        await Promise.all([refetch(), onAdded()]);
      } catch (error) {
        toast.error("Couldn't add cAMPer: " + errorMessage(error));
      } finally {
        setAddingId(null);
      }
    },
    [addHire, refetch, onAdded]
  );

  const suggestions = data?.suggestions ?? [];
  if (suggestions.length === 0) return null;

  return (
    <Card className="p-5 border-blue-200 bg-blue-50/60">
      <div className="flex items-center gap-2 mb-3">
        <Icon icon="bell" className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-blue-900">
          {suggestions.length === 1 ? "A new hire listed you as their manager" : `${suggestions.length} new hires listed you as their manager`}
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {suggestions.map((s) => {
          const name = `${s.first_name} ${s.last_name}`;
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-lg bg-background border border-border px-3 py-2">
              <CamperAvatar email={s.email} photoUrl={s.photo_url} name={name} size="sm" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{name}</span>
                <span className="text-xs text-muted-foreground truncate">{s.role}</span>
              </div>
              <Button size="sm" onClick={() => handleAdd(s.id, name)} disabled={addingId !== null}>
                {addingId === s.id ? (
                  <Icon icon="loader-2" className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon icon="user-plus" className="w-3.5 h-3.5" />
                )}
                Add to my dashboard
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
