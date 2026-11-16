import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import type { ApiRegistry } from "../../../server/apis/index.js";
import PickedTeamsRow from "./PickedTeamsRow.js";
import RoundCounselorControls from "./RoundCounselorControls.js";
import UpNowCard from "./UpNowCard.js";

export type PresentationRound = Awaited<ReturnType<ApiRegistry["GetPresentationRound"]["run"]>>;

type Props = {
  round: PresentationRound | undefined;
  refetch: () => Promise<unknown>;
};

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

/**
 * Live presenting round for the active cohort. A counselor picks the presentation; each Randomize
 * press picks one team that hasn't gone yet. Scores appear once every judge has scored that team.
 */
export default function PresentationOrderStrip({ round, refetch }: Props) {
  const { run: pickNext, loading: picking } = useApi("PickNextPresenter");
  const { run: setRound, loading: updating } = useApi("SetPresentationRound");

  const handlePick = useCallback(async () => {
    try {
      const res = await pickNext({});
      if (res?.success) toast.success(`🎲 ${res.message}`);
      else toast.info(res?.message ?? "Couldn't pick a team");
      await refetch();
    } catch (err) {
      toast.error("Couldn't pick a team: " + errorText(err));
    }
  }, [pickNext, refetch]);

  const handleAction = useCallback(
    async (action: "start" | "undo_last" | "restart" | "end", presentationId: number | null) => {
      try {
        const res = await setRound({ action, presentation_id: presentationId });
        if (res?.success) toast.success(res.message);
        else toast.info(res?.message ?? "Nothing changed");
        await refetch();
      } catch (err) {
        toast.error(errorText(err));
      }
    },
    [setRound, refetch]
  );

  if (!round) return null;
  const { active, picked, is_counselor: isCounselor } = round;
  const upNow = picked.find((p) => p.is_up_now) ?? null;

  // Nothing running: cAMPers see nothing; counselors see the picker.
  if (!active) {
    if (!isCounselor) return null;
    return (
      <div className="space-y-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-3">
        <p className="text-sm font-semibold text-indigo-900">🎤 Presenting order</p>
        <p className="text-xs text-indigo-900/70">Pick the presentation to start a round. cAMPers can then press Randomize to pick who's up.</p>
        <RoundCounselorControls presentations={round.presentations} activeId={null} hasPicks={false} busy={updating} onAction={handleAction} />
      </div>
    );
  }

  const hasRubric = active.rubric_template_id !== null;

  return (
    <div className="space-y-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-900/70">Now presenting</p>
          <p className="text-base font-bold text-indigo-950">{active.title}</p>
        </div>
        <span className="text-xs font-medium text-indigo-900/70">
          {picked.length} of {round.total_teams} teams up · {round.remaining} to go
        </span>
      </div>

      {upNow && !round.all_picked && <UpNowCard team={upNow} position={upNow.position} total={round.total_teams} />}

      <PickedTeamsRow picked={picked} hasRubric={hasRubric} judgesNeeded={round.judges_needed} />

      <RoundStatus round={round} hasRubric={hasRubric} picking={picking} onPick={handlePick} />

      {isCounselor && (
        <RoundCounselorControls
          presentations={round.presentations}
          activeId={active.id}
          hasPicks={picked.length > 0}
          busy={updating}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

function RoundStatus({ round, hasRubric, picking, onPick }: {
  round: PresentationRound;
  hasRubric: boolean;
  picking: boolean;
  onPick: () => void;
}) {
  if (round.total_teams === 0) {
    return <p className="text-sm text-muted-foreground">No teams in this cohort yet.</p>;
  }
  if (round.round_complete) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <Icon icon="circle-check" className="h-4 w-4" />
        <span>
          <b>Round complete!</b> Every team has presented{hasRubric ? " and every judge has scored" : ""}.
          {round.is_counselor && " Pick the next presentation below to start a new round."}
        </span>
      </div>
    );
  }
  if (round.all_picked) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <Icon icon="hourglass" className="h-4 w-4" />
        Every team has presented. Waiting on judges to score {round.waiting_on_scores} team{round.waiting_on_scores === 1 ? "" : "s"}.
      </div>
    );
  }
  return (
    <Button
      onClick={onPick}
      disabled={picking}
      className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600"
    >
      <Icon icon="shuffle" className="mr-1.5 h-4 w-4" />
      {picking ? "Picking..." : round.picked.length === 0 ? "🎲 Randomize: who goes first?" : "🎲 Randomize next team"}
    </Button>
  );
}
