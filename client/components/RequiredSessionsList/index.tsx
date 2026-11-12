import { Icon } from "@/components/ui/icon";
import { blackoutWhen, type BlackoutSession } from "@/lib/blackouts.js";

type Props = {
  sessions: BlackoutSession[];
  /** Sessions the current start/end would overlap, highlighted. */
  hitIds: ReadonlySet<number>;
};

/** "Required sessions" list on the absence form so cAMPers know which times are off limits. */
export default function RequiredSessionsList({ sessions, hitIds }: Props) {
  if (sessions.length === 0) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-red-900">
        <Icon icon="shield-alert" className="h-4 w-4 text-red-600" />
        Required sessions: no absences during these times
      </p>
      <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {sessions.map((s) => {
          const hit = hitIds.has(s.agenda_id);
          return (
            <li
              key={s.agenda_id}
              className={`rounded-md px-2 py-1 text-[11px] ${hit ? "bg-red-600 text-white" : "bg-background text-red-900"}`}
            >
              <span className="font-semibold">{s.title}</span>
              <span className={hit ? "text-white/90" : "text-red-800/70"}> · {blackoutWhen(s)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
