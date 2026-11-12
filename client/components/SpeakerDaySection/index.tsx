import { Icon } from "@/components/ui/icon";
import ExecutiveCard from "@/components/ExecutiveCard/index.js";
import type { Executive, SpeakerDayGroup } from "@/lib/speakers.js";

type SpeakerDaySectionProps = {
  group: SpeakerDayGroup;
  isAdmin: boolean;
  mySpeakerId: number | null;
  onOpen: (exec: Executive) => void;
  onEdit: (exec: Executive) => void;
};

/** One day's speakers on the Speakers tab, with a day header. Counselors also see lock status. */
export default function SpeakerDaySection({ group, isAdmin, mySpeakerId, onOpen, onEdit }: SpeakerDaySectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
        {isAdmin && group.dayNumber !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              group.locked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <Icon icon={group.locked ? "lock" : "lock-open"} className="h-3 w-3" />
            {group.locked ? "Hidden from cAMPers until day unlocks" : "Visible to cAMPers"}
          </span>
        )}
        {isAdmin && group.dayNumber === null && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Hidden from cAMPers: pick a session
          </span>
        )}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {group.speakers.map((exec) => (
          <div key={exec.id} className="cursor-pointer" onClick={() => onOpen(exec)}>
            <ExecutiveCard executive={exec} isAdmin={isAdmin} onEdit={onEdit} isMine={mySpeakerId === exec.id} />
          </div>
        ))}
      </div>
    </section>
  );
}
