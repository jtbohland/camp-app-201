import { Icon } from "@/components/ui/icon";
import { formatPacificDay, type PreworkPreview } from "@/lib/counselorPrework.js";

type Props = {
  camperName: string;
  titles: string[];
  date: string;
  preview: PreworkPreview;
  penaltyApplied: boolean;
};

/** Step 2: what will happen, in plain words, before anything is saved. */
export default function PreworkConfirmSummary({ camperName, titles, date, preview, penaltyApplied }: Props) {
  const total = preview.itemPoints + preview.earlyBird;
  return (
    <div className="space-y-3 text-sm">
      <p>
        Mark <span className="font-semibold">{titles.length} item{titles.length === 1 ? "" : "s"}</span> complete for{" "}
        <span className="font-semibold">{camperName}</span>, finished on <span className="font-semibold">{formatPacificDay(date)}</span>:
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
        {titles.map((t) => <li key={t}>{t}</li>)}
      </ul>

      <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        {preview.onTime ? (
          <p className="flex items-center gap-1.5">
            <Icon icon="zap" className="h-4 w-4" /> +{preview.itemPoints} pts for the items
          </p>
        ) : (
          <p className="flex items-center gap-1.5">
            <Icon icon="clock" className="h-4 w-4" /> After the pre-work deadline: done, for 0 pts
          </p>
        )}
        {preview.earlyBird > 0 && (
          <p className="flex items-center gap-1.5">
            <Icon icon="bird" className="h-4 w-4" /> +{preview.earlyBird} pts early-bird bonus
          </p>
        )}
        {penaltyApplied && preview.finishesAll && preview.onTime && (
          <p className="flex items-center gap-1.5">
            <Icon icon="undo-2" className="h-4 w-4" /> Missed-deadline penalty reversed
          </p>
        )}
        <p className="pt-1 font-semibold">Estimated total: +{total} pts</p>
      </div>

      <p className="text-xs text-muted-foreground">
        {preview.finishesAll
          ? "All pre-work will show complete and the reminder pop-up stops. "
          : "Some pre-work will still be open. "}
        Each item is noted as marked complete by a counselor. This can't be undone from the app.
      </p>
    </div>
  );
}
