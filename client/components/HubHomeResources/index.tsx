import { useMemo } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import SessionResourceRow from "@/components/SessionResourceRow/index.js";
import { groupResourcesByDay, type AgendaResource } from "@/lib/sessionResources.js";

type Props = {
  resources: AgendaResource[];
  /** Today's cAMP day (Pacific time), or null outside of cAMP week. */
  today: number | null;
};

const MAX_SESSIONS = 6;

/**
 * Team Hub Home: "Today's Resources". Shows today's unlocked session decks; outside cAMP days,
 * falls back to the most recent unlocked day so the card is still useful.
 */
export default function HubHomeResources({ resources, today }: Props) {
  const { day, isToday } = useMemo(() => {
    const days = groupResourcesByDay(resources).filter((d) => !d.locked);
    if (days.length === 0) return { day: null, isToday: false };
    const todays = today !== null ? days.find((d) => d.dayNumber === today) : undefined;
    if (todays) return { day: todays, isToday: true };
    const earlier = today !== null ? days.filter((d) => d.dayNumber < today) : [];
    return { day: earlier.at(-1) ?? days.at(-1) ?? null, isToday: false };
  }, [resources, today]);

  if (!day) return null;

  const shown = day.sessions.slice(0, MAX_SESSIONS);
  const more = day.sessions.length - shown.length;

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon icon="presentation" className="h-4 w-4 text-amber-500" />
          {isToday ? "Today's resources" : "Session resources"}
        </h3>
        <span className="text-xs text-muted-foreground">{day.label}</span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {shown.map((s) => (
          <SessionResourceRow key={s.agendaItemId} session={s} compact />
        ))}
      </div>
      <Link to="/agenda?tab=resources" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        {more > 0 ? `${more} more · ` : ""}All resources
        <Icon icon="arrow-right" className="h-3 w-3" />
      </Link>
    </Card>
  );
}
