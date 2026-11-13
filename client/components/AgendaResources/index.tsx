import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import SessionResourceRow from "@/components/SessionResourceRow/index.js";
import { groupResourcesByDay, type AgendaResource } from "@/lib/sessionResources.js";

type Props = {
  isAdmin: boolean;
};

/**
 * Agenda > Resources. Session decks and links grouped by day, like Speakers.
 * The API only sends cAMPers days that are unlocked; counselors see everything with a lock badge.
 */
export default function AgendaResources({ isAdmin }: Props) {
  const { data, loading, fetching, isError, refetch } = useApiData("GetAgendaResources", {});
  const days = useMemo(() => groupResourcesByDay((data?.resources ?? []) as AgendaResource[]), [data]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex items-center justify-between gap-3 p-4 text-sm">
        <span className="text-muted-foreground">Couldn't load resources.</span>
        <button type="button" onClick={() => refetch()} className="text-xs font-medium text-primary hover:underline">
          Try again
        </button>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${fetching ? "opacity-70" : ""}`}>
      <p className="text-sm text-muted-foreground">
        {isAdmin
          ? "Slides and links added to sessions in Counselor Hub > Agenda. cAMPers see a day's resources once that day is unlocked."
          : "Slides and links for each session so you can follow along. More appear as each day unlocks."}
      </p>

      {days.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed bg-muted/20 p-10 text-center text-muted-foreground">
          <Icon icon="presentation" className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            {isAdmin ? "No session resources yet. Add links when you edit a session in Counselor Hub > Agenda." : "Resources will appear here as each day's agenda unlocks."}
          </p>
        </Card>
      ) : (
        days.map((day) => (
          <section key={day.dayNumber} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{day.label}</h3>
              {isAdmin && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    day.locked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  <Icon icon={day.locked ? "lock" : "lock-open"} className="h-3 w-3" />
                  {day.locked ? "Hidden from cAMPers until day unlocks" : "Visible to cAMPers"}
                </span>
              )}
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {day.sessions.map((s) => (
                <SessionResourceRow key={s.agendaItemId} session={s} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
