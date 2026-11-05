import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";

type Props = { camperId: number };

/** Last 10 check-ins with timing and points. Hidden when there are none. */
export default function CheckInHistoryCard({ camperId }: Props) {
  const { data } = useApiData("GetCheckInHistory", { camper_id: camperId }, { enabled: camperId > 0 });
  const history = (data?.history ?? []) as any[];
  if (history.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon="history" className="w-5 h-5 text-camp-green" />
        Check-in History
      </h2>
      <div className="flex flex-col gap-2">
        {history.slice(0, 10).map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  entry.timing === "early" ? "bg-green-500" : entry.timing === "on_time" ? "bg-yellow-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium text-foreground">
                {entry.timing === "early" ? "Early" : entry.timing === "on_time" ? "On Time" : "Late"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold ${
                  entry.points_awarded > 0 ? "text-green-600" : entry.points_awarded < 0 ? "text-red-600" : "text-muted-foreground"
                }`}
              >
                {entry.points_awarded > 0 ? "+" : ""}
                {entry.points_awarded} pts
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.checked_in_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
