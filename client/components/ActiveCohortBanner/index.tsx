import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatCohortDate } from "@/lib/cohortRefresh";

type Props = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  camperCount: number;
  campClosed: boolean;
  legacyWallNumber: number | null;
  onStartNew: () => void;
  onGoToClose: () => void;
};

/** Header card showing the active cohort and its lifecycle status. */
export default function ActiveCohortBanner({
  name, startDate, endDate, camperCount, campClosed, legacyWallNumber, onStartNew, onGoToClose,
}: Props) {
  const start = formatCohortDate(startDate);
  const end = formatCohortDate(endDate);
  const dates = start && end ? `${start} – ${end}` : start ?? end ?? "Dates not set";

  const status = legacyWallNumber
    ? { label: `On the Legacy Wall (#${legacyWallNumber})`, cls: "bg-blue-100 text-blue-800" }
    : campClosed
      ? { label: "Closed", cls: "bg-amber-100 text-amber-800" }
      : { label: "Active", cls: "bg-emerald-100 text-emerald-800" };

  return (
    <Card className="p-5 border-emerald-200 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Icon icon="tent" className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active cohort</p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mt-0.5">{name}</h2>
            <p className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1"><Icon icon="calendar" className="w-3.5 h-3.5" />{dates}</span>
              <span className="flex items-center gap-1"><Icon icon="users" className="w-3.5 h-3.5" />{camperCount} cAMPer{camperCount === 1 ? "" : "s"} registered</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!campClosed && (
            <Button variant="outline" size="sm" onClick={onGoToClose}>
              <Icon icon="flag" className="w-4 h-4 mr-1" />
              Close this cohort
            </Button>
          )}
          <Button size="sm" onClick={onStartNew} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Icon icon="plus" className="w-4 h-4 mr-1" />
            Start new cohort
          </Button>
        </div>
      </div>
    </Card>
  );
}
