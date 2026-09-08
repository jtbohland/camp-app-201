import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type Props = {
  camperId: number;
  flightDepartureDate: string | null;
  flightDepartureTime: string | null;
  leaveOfficeBy: string | null;
  onSaved: () => void;
};

export default function FlightDepartureSection({
  camperId,
  flightDepartureDate,
  flightDepartureTime,
  leaveOfficeBy,
  onSaved,
}: Props) {
  const [date, setDate] = useState(flightDepartureDate ?? "");
  const [time, setTime] = useState(flightDepartureTime ?? "");
  const [leaveBy, setLeaveBy] = useState(leaveOfficeBy ?? "");
  const { run: updateFlight, loading } = useApi("UpdateFlightInfo");

  useEffect(() => {
    setDate(flightDepartureDate ?? "");
    setTime(flightDepartureTime ?? "");
    setLeaveBy(leaveOfficeBy ?? "");
  }, [flightDepartureDate, flightDepartureTime, leaveOfficeBy]);

  const handleSave = useCallback(async () => {
    try {
      await updateFlight({
        camper_id: camperId,
        flight_departure_date: date || null,
        flight_departure_time: time || null,
        leave_office_by: leaveBy || null,
      });
      toast.success("Flight info saved!");
      onSaved();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [camperId, date, time, leaveBy, updateFlight, onSaved]);

  const hasInfo = date || time || leaveBy;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Icon icon="plane-takeoff" className="w-5 h-5 text-camp-amber" />
        Flight Departure
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Help us plan the final day — when are you flying out?
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Departure Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Departure Time</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Need to Leave Office By</Label>
          <Input
            type="time"
            value={leaveBy}
            onChange={(e) => setLeaveBy(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {hasInfo ? (
            <span className="text-camp-green flex items-center gap-1">
              <Icon icon="check" className="w-3 h-3" /> Flight info saved
            </span>
          ) : (
            "Please fill in your departure details"
          )}
        </div>
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "Saving..." : "Save Flight Info"}
        </Button>
      </div>
    </Card>
  );
}
