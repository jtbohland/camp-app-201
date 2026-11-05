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
  isLocal: boolean;
  flightDepartureDate: string | null;
  flightDepartureTime: string | null;
  leaveOfficeBy: string | null;
  onSaved: () => void;
};

export default function FlightDepartureSection({
  camperId,
  isLocal: savedLocal,
  flightDepartureDate,
  flightDepartureTime,
  leaveOfficeBy,
  onSaved,
}: Props) {
  const [isLocal, setIsLocal] = useState(savedLocal);
  const [date, setDate] = useState(flightDepartureDate ?? "");
  const [time, setTime] = useState(flightDepartureTime ?? "");
  const [leaveBy, setLeaveBy] = useState(leaveOfficeBy ?? "");
  const { run: updateFlight, loading } = useApi("UpdateFlightInfo");

  useEffect(() => {
    setIsLocal(savedLocal);
    setDate(flightDepartureDate ?? "");
    setTime(flightDepartureTime ?? "");
    setLeaveBy(leaveOfficeBy ?? "");
  }, [savedLocal, flightDepartureDate, flightDepartureTime, leaveOfficeBy]);

  const save = useCallback(
    async (local: boolean) => {
      try {
        await updateFlight({
          camper_id: camperId,
          is_local: local,
          flight_departure_date: local ? null : date || null,
          flight_departure_time: local ? null : time || null,
          leave_office_by: local ? null : leaveBy || null,
        });
        toast.success(local ? "Got it, you're local. No flight needed!" : "Flight info saved!");
        onSaved();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err);
        toast.error("Error: " + message);
      }
    },
    [camperId, date, time, leaveBy, updateFlight, onSaved]
  );

  const hasInfo = savedLocal || !!(flightDepartureDate || flightDepartureTime || leaveOfficeBy);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Icon icon="plane-takeoff" className="w-5 h-5 text-camp-amber" />
        Flight Departure
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Help us plan the final day — when are you flying out?
      </p>

      {/* Flying vs local */}
      <div className="mb-4 flex w-fit self-start rounded-lg border border-border p-1" role="radiogroup" aria-label="Are you flying?">
        {[
          { local: false, label: "I'm flying", icon: "plane" as const },
          { local: true, label: "Local (no flight)", icon: "house" as const },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={isLocal === opt.local}
            onClick={() => setIsLocal(opt.local)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isLocal === opt.local ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon icon={opt.icon} className="h-4 w-4" />
            {opt.label}
          </button>
        ))}
      </div>

      {isLocal ? (
        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          You live near San Francisco or are otherwise local, so there's no flight to plan around.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Departure Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Departure Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Need to Leave Office By</Label>
            <Input type="time" value={leaveBy} onChange={(e) => setLeaveBy(e.target.value)} />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {hasInfo ? (
            <span className="text-camp-green flex items-center gap-1">
              <Icon icon="check" className="w-3 h-3" /> {savedLocal ? "Saved as Local" : "Flight info saved"}
            </span>
          ) : (
            "Please fill in your departure details, or choose Local"
          )}
        </div>
        <Button onClick={() => save(isLocal)} disabled={loading} size="sm">
          {loading ? "Saving..." : isLocal ? "Save as Local" : "Save Flight Info"}
        </Button>
      </div>
    </Card>
  );
}
