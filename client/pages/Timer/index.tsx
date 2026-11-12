import { useState, useCallback, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import { useTimerContext } from "@/components/TimerContext/index.js";
import TimerDisplay from "@/components/TimerDisplay/index.js";
import TimerControls, { TIMER_MODES } from "@/components/TimerControls/index.js";
import TeamCheckInRace from "@/components/TeamCheckInRace/index.js";

const errText = (e: unknown) =>
  e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

export default function TimerPage() {
  const timer = useTimerContext();
  const { state } = timer;
  const { isAdmin } = useIsAdmin();
  const user = useSuperblocksUser();
  const { data: camperData } = useApiData("GetCurrentCamper", { email: user?.email ?? "" }, { enabled: !!user?.email && isAdmin });

  const [mode, setMode] = useState<string>("morning");
  const [busy, setBusy] = useState(false);
  const currentMode = TIMER_MODES.find((m) => m.value === mode);

  // Check-in status (the word itself only comes back for counselors).
  const { data: checkinData, refetch: refetchCheckin } = useApiData("GetActiveCheckIn", {}, {
    refetchInterval: state.running ? 3000 : 10000,
  });
  const activeSession = checkinData?.active ? checkinData.session : null;
  const checkinOpen = checkinData?.checkin_open ?? false;
  const currentWord = checkinData?.current_word ?? null;

  // Show the mode that matches what's running (e.g. after a refresh).
  useEffect(() => {
    const match = TIMER_MODES.find((m) => m.label === (activeSession?.label ?? state.label));
    if (match) setMode(match.value);
  }, [activeSession?.label, state.label]);

  const { run: startCheckIn } = useApi("StartCheckIn");
  const { run: closeCheckIn } = useApi("CloseCheckIn");

  const handleStart = useCallback(
    async (withCheckIn: boolean) => {
      setBusy(true);
      try {
        const label = currentMode?.label ?? "";
        const fromTop = state.finished || state.remaining >= state.totalSeconds;
        if (!(await timer.start(label))) return;
        if (withCheckIn && fromTop) {
          try {
            await startCheckIn({
              label,
              duration_minutes: Math.ceil(state.totalSeconds / 60),
              counselor_id: camperData?.camper?.id ?? 0,
            });
            await refetchCheckin();
            toast.success(`Check-in started: "${label}"`);
          } catch (e) {
            toast.error("Timer started, but the check-in didn't: " + errText(e));
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [currentMode?.label, state, timer, startCheckIn, camperData, refetchCheckin]
  );

  const handleCloseCheckIn = useCallback(async () => {
    if (!activeSession) return;
    try {
      const result = await closeCheckIn({ session_id: activeSession.id });
      await refetchCheckin();
      const s = result?.summary;
      if (!s) return;
      toast.success(
        `Check-in closed! ${s.early_count} early, ${s.on_time_count} on-time, ${s.late_count} late, ${s.missed_count} missed${s.first_team_name ? ` — 🏆 ${s.first_team_name} first!` : ""}`
      );
    } catch (e) {
      toast.error("Failed to close check-in: " + errText(e));
    }
  }, [activeSession, closeCheckIn, refetchCheckin]);

  const withBusy = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  const heading = activeSession?.label || state.label;

  return (
    <div className="flex flex-col items-center gap-6 p-6 w-full overflow-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Icon icon="timer" className="w-6 h-6 text-primary" />
          Session Timer
        </h1>
        {heading && (state.running || activeSession) && (
          <p className="text-sm text-primary font-medium mt-1">
            {activeSession ? `Check-in active: ${activeSession.label}` : heading}
          </p>
        )}
        {!isAdmin && (
          <p className="text-xs text-muted-foreground mt-1">Your counselors run this timer. It updates live.</p>
        )}
      </div>

      <TimerDisplay
        remaining={state.remaining}
        totalSeconds={state.totalSeconds}
        finished={state.finished}
        checkinOpen={checkinOpen}
        large={!isAdmin}
      />

      {/* Counselors only: the word is for the big screen in the room. */}
      {isAdmin && checkinOpen && currentWord && (
        <div className="bg-card border border-border rounded-xl px-8 py-4 text-center shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Trail Marker</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-primary">{currentWord}</p>
          <p className="text-xs text-muted-foreground mt-1">Changes every 15 seconds</p>
        </div>
      )}

      {!isAdmin && checkinOpen && (
        <p className="text-sm text-green-700 font-medium text-center max-w-sm">
          Check-in is open. Use the trail marker word on the screen in the room.
        </p>
      )}

      {isAdmin && (
        <TimerControls
          mode={mode}
          onModeChange={setMode}
          running={state.running}
          finished={state.finished}
          remaining={state.remaining}
          totalSeconds={state.totalSeconds}
          checkInActive={!!activeSession}
          busy={busy}
          onStart={handleStart}
          onPause={() => withBusy(timer.pause)}
          onReset={() => withBusy(timer.reset)}
          onCloseCheckIn={handleCloseCheckIn}
          onSetLength={(s) => withBusy(() => timer.setLength(s, currentMode?.label ?? null))}
          sounds={timer.sounds}
          soundIndex={timer.soundIndex}
          onSoundChange={timer.setSoundIndex}
          onTestSound={timer.playSound}
        />
      )}

      {activeSession && <TeamCheckInRace teams={checkinData?.teams_progress ?? []} />}
    </div>
  );
}
