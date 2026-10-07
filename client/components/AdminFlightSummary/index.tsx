import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";

export default function AdminFlightSummary() {
  const { data, loading } = useApiData("GetFlightSummary", {});
  const flights = (data?.flights ?? []) as any[];

  if (loading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const withFlights = flights.filter((f) => f.flight_departure_date);
  const withoutFlights = flights.filter((f) => !f.flight_departure_date);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon icon="plane-takeoff" className="w-4 h-4 text-amber-600" />
            Flight Departures ({withFlights.length}/{flights.length} submitted)
          </h3>
        </div>

        {withFlights.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No flight info submitted yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Departure Date</th>
                  <th className="text-left py-2 px-2">Departure Time</th>
                  <th className="text-left py-2 px-2">Leave Office By</th>
                </tr>
              </thead>
              <tbody>
                {withFlights.map((f: any) => (
                  <tr key={f.id} className="border-b border-border/60 text-foreground/80">
                    <td className="py-2 px-2 font-medium">{f.first_name} {f.last_name}</td>
                    <td className="py-2 px-2">{f.flight_departure_date ?? "—"}</td>
                    <td className="py-2 px-2">{f.flight_departure_time ?? "—"}</td>
                    <td className="py-2 px-2">
                      {f.leave_office_by ? (
                        <span className="text-amber-600 font-medium">{f.leave_office_by}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {withoutFlights.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">
            Missing Flight Info ({withoutFlights.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {withoutFlights.map((f: any) => (
              <span key={f.id} className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded">
                {f.first_name} {f.last_name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
