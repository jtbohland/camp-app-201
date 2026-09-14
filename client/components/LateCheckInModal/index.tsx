import { useState, useCallback, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type Props = {
  camperId: number;
  isAdmin: boolean;
};

export default function LateCheckInModal({ camperId, isAdmin }: Props) {
  const [pin, setPin] = useState("");
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  // Poll for active session
  const { data } = useApiData("GetActiveCheckIn", {}, {
    refetchInterval: 10000,
    enabled: camperId > 0 && !isAdmin,
  });

  // Check if this camper has already checked in
  const { data: historyData } = useApiData("GetCheckInHistory" as any, {
    camper_id: camperId,
  }, {
    enabled: camperId > 0 && !isAdmin && !!data?.session,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const { run: submitLate, loading } = useApi("SubmitLateCheckIn");

  const session = data?.session;
  const graceExpired = session?.timer_ends_at
    ? new Date().getTime() > new Date(session.timer_ends_at).getTime() + 60000
    : false;

  // Check if camper has a response for this session
  const checkedIn = session
    ? ((historyData as any)?.history ?? []).some((h: any) => h.session_id === session.id)
    : true;

  const showModal = session && !checkedIn && graceExpired && !dismissed.has(session.id) && session.status === 'active';

  const handleSubmit = useCallback(async () => {
    if (!session || !pin.trim()) return;
    try {
      const result = await submitLate({
        camper_id: camperId,
        session_id: session.id,
        pin: pin.trim(),
      });
      if (result && result.success) {
        toast.warning(`Late check-in recorded (${result.points} pts)`);
        setDismissed((prev) => new Set(prev).add(session.id));
        setPin("");
      } else if (result) {
        toast.error(result.error || "Check-in failed");
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [session, pin, camperId, submitLate]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
        {/* Warning header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Icon icon="alert-triangle" className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">You're Late! ⏰</h3>
            <p className="text-sm text-muted-foreground">
              Check-in window has closed
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground/80 mb-4">
          Please still check in with your PIN. This will deduct <span className="font-bold text-red-500">2 points</span> from your individual score.
        </p>

        {/* PIN input */}
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Enter your PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={6}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          <Button
            onClick={handleSubmit}
            disabled={loading || !pin.trim()}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Checking in..." : "Check In Late (-2 pts)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
