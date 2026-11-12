import { useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { SPEAKER_DAY_LABELS, formatSessionTime } from "@/lib/speakers.js";

type SpeakerSessionSelectProps = {
  value: number | null;
  onChange: (agendaItemId: number | null) => void;
  className?: string;
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  executive: "Executive",
  presentation: "Presentation",
  core: "Core",
  workshop: "Workshop",
  challenger: "Challenger",
  value: "Value",
  break: "Break",
};

/** Dropdown of every agenda session, grouped by day, so a speaker can be mapped to the session they present in. */
export default function SpeakerSessionSelect({ value, onChange, className }: SpeakerSessionSelectProps) {
  const { data, loading } = useApiData("GetAgenda", {}, { staleTime: 30_000 });

  const days = useMemo(() => {
    const items = (data?.items ?? []).filter((i) => i.session_type !== "break");
    const byDay = new Map<number, typeof items>();
    for (const item of items) byDay.set(item.day_number, [...(byDay.get(item.day_number) ?? []), item]);
    return [...byDay.entries()].sort(([a], [b]) => a - b);
  }, [data]);

  // Keep the current session selectable even if it's been removed from the agenda list.
  const hasValue = value === null || days.some(([, items]) => items.some((i) => i.id === value));

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={loading}
      className={className}
    >
      <option value="">{loading ? "Loading sessions..." : "No session yet"}</option>
      {!hasValue && <option value={value ?? ""}>Current session (no longer on the agenda)</option>}
      {days.map(([day, items]) => (
        <optgroup key={day} label={`Day ${day} · ${SPEAKER_DAY_LABELS[day] ?? ""}`}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {formatSessionTime(item.start_time)} · {item.title} ({SESSION_TYPE_LABELS[item.session_type] ?? item.session_type})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
