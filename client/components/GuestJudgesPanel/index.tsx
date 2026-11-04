import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi.js";
import { useApiData } from "@/hooks/useApiData.js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import AddGuestJudgeDialog from "@/components/AddGuestJudgeDialog/index.js";

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Request failed";
}

type Props = {
  /** Points one judge can give on this rubric (shown so the new max is clear). */
  maxPerJudge: number;
  /** Counselors plus guest judges scoring this cohort. */
  judgeCount: number;
  /** Guest judges see the list but can't add or remove judges. */
  canManage: boolean;
};

/** Guest judges for this cohort. Each one adds another judge's score to every team's total. */
export default function GuestJudgesPanel({ maxPerJudge, judgeCount, canManage }: Props) {
  const { data, refetch } = useApiData("GetGuestJudges", {});
  const { run: addJudge, loading: adding } = useApi("AddGuestJudge");
  const { run: removeJudge } = useApi("RemoveGuestJudge");
  const [open, setOpen] = useState(false);
  const judges = data?.judges ?? [];

  const handleAdd = useCallback(async (name: string, email: string) => {
    try {
      await addJudge({ name, email });
      toast.success(`${name} can now sign in and score as a judge`);
      setOpen(false);
      await refetch();
    } catch (error) {
      toast.error("Couldn't add judge: " + errorMessage(error));
    }
  }, [addJudge, refetch]);

  const handleRemove = useCallback(async (id: number, name: string) => {
    if (!window.confirm(`End ${name}'s judge access? Scores they already gave are kept.`)) return;
    try {
      await removeJudge({ id });
      toast.success(`${name}'s judge access ended`);
      await refetch();
    } catch (error) {
      toast.error("Couldn't remove judge: " + errorMessage(error));
    }
  }, [removeJudge, refetch]);

  return (
    <Card className="p-4 border-violet-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="gavel" className="w-4 h-4 text-violet-500" />
          <h4 className="text-sm font-bold">Judges</h4>
          <span className="text-xs text-muted-foreground">
            {judgeCount} judge{judgeCount === 1 ? "" : "s"} · each team can earn up to {judgeCount * maxPerJudge} pts
          </span>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Icon icon="user-plus" className="w-3.5 h-3.5 mr-1.5" /> Add a Guest Judge
          </Button>
        )}
      </div>

      {judges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {judges.map((j) => (
            <span key={j.id} className="inline-flex items-center gap-1.5 text-xs bg-violet-50 border border-violet-200 rounded-full pl-2.5 pr-1 py-0.5">
              <span className="font-medium">{j.name}</span>
              <span className="text-muted-foreground">Guest</span>
              {canManage && (
                <button
                  type="button"
                  aria-label={`Remove ${j.name}`}
                  onClick={() => handleRemove(j.id, j.name)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-destructive/10"
                >
                  <Icon icon="x" className="w-3 h-3 text-destructive" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">
        Guest judges get counselor access right away with no password. Their access ends when cAMP closes or a new cohort starts.
      </p>

      <AddGuestJudgeDialog open={open} saving={adding} onClose={() => setOpen(false)} onAdd={handleAdd} />
    </Card>
  );
}
