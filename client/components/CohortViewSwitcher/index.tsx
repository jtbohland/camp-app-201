import { useCallback } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useCohortView } from "@/hooks/useCohortView";
import { errorMessage } from "@/lib/cohortRefresh";

type Cohort = { id: number; name: string; is_active: boolean; camper_count: number };

/**
 * Counselor-only cohort picker. Switching changes what the whole app shows for this
 * counselor (Hub and every cAMPer page). cAMPers never see this and aren't affected.
 */
export default function CohortViewSwitcher() {
  const { cohortId, activeCohortId, switchTo, switching } = useCohortView();
  const { data } = useApiData("GetCohorts", {}, { staleTime: 30_000 });
  const cohorts = (data?.cohorts ?? []) as Cohort[];

  // Hide empty cohorts that were never used, but always keep the active and current pick.
  const options = cohorts.filter((c) => c.is_active || c.camper_count > 0 || c.id === cohortId);

  const handleChange = useCallback(
    async (value: string) => {
      const id = Number(value);
      try {
        await switchTo(id === activeCohortId ? null : id);
      } catch (e) {
        toast.error("Couldn't switch cohorts: " + errorMessage(e));
      }
    },
    [switchTo, activeCohortId]
  );

  if (options.length === 0) return null;

  return (
    <Select value={cohortId?.toString() ?? ""} onValueChange={handleChange} disabled={switching}>
      <SelectTrigger className="h-8 text-xs" aria-label="Cohort to view">
        <SelectValue placeholder="Choose cohort" />
      </SelectTrigger>
      <SelectContent>
        {options.map((c) => (
          <SelectItem key={c.id} value={c.id.toString()}>
            {c.name}
            <span className="ml-1.5 text-muted-foreground">
              · {c.is_active ? "Active" : "Past, read-only"}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
