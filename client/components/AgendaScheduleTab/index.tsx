import { useState, useCallback, useMemo, useEffect } from "react";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SessionBankPanel, { type BankSession } from "@/components/SessionBankPanel";
import DaySchedule, { type AgendaItem, timeToMinutes } from "@/components/DaySchedule";
import AgendaResources from "@/components/AgendaResources/index.js";

const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

const TIME_LABELS: string[] = ["8:30 AM"];
for (let h = 9; h <= 17; h++) {
  const hour = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  TIME_LABELS.push(`${hour}:00 ${ampm}`);
}

export default function AgendaScheduleTab() {
  const user = useSuperblocksUser();

  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { data: configData, loading: configLoading } = useApiData("GetCampConfig", {});
  const { data: bankData, loading: bankLoading, refetch: refetchBank } = useApiData("GetSessionBank", {});
  const { data: agendaData, loading: agendaLoading, fetching: agendaFetching, refetch: refetchAgenda } = useApiData("GetAgenda", {});

  // Live clock — updates every 60s, in PT
  const [nowPT, setNowPT] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowPT(new Date(d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })));
    };
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, []);

  const { run: scheduleSession } = useApi("ScheduleSession");
  const { run: removeItem } = useApi("RemoveAgendaItem");
  const { run: updateConfig } = useApi("UpdateCampConfig");
  const { run: clearDay } = useApi("ClearDaySchedule");
  const { run: moveItem } = useApi("MoveAgendaItem");

  const [numDays, setNumDays] = useState<number | null>(null);
  const [activeDrag, setActiveDrag] = useState<BankSession | AgendaItem | null>(null);
  const [activeDragType, setActiveDragType] = useState<"bank" | "agenda" | null>(null);

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const camperId = camperData?.camper?.id ?? 0;

  // Compute current cAMP day + time
  const campStartDate = useMemo(() => {
    if (configData?.config) {
      const sd = configData.config.find((c: any) => c.key === "camp_start_date");
      if (sd?.value) return sd.value;
    }
    return null;
  }, [configData]);

  const currentDayNumber = useMemo(() => {
    if (!campStartDate) return null;
    const start = new Date(campStartDate + "T00:00:00");
    const diffMs = nowPT.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null; // before cAMP
    return diffDays + 1; // Day 1, 2, 3...
  }, [campStartDate, nowPT]);

  const currentTimeMinutes = nowPT.getHours() * 60 + nowPT.getMinutes();

  const configDays = useMemo(() => {
    if (configData?.config) {
      const dayConfig = configData.config.find((c: any) => c.key === "num_days");
      if (dayConfig) return parseInt(dayConfig.value, 10);
    }
    return null;
  }, [configData]);

  const effectiveDays = numDays ?? configDays ?? 3;

  const handleDaysChange = useCallback(async (value: string) => {
    const days = parseInt(value, 10);
    setNumDays(days);
    try {
      await updateConfig({ key: "num_days", value: value });
    } catch (err) {
      toast.error("Failed to save days config");
    }
  }, [updateConfig]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const bankSession = event.active.data.current?.session as BankSession | undefined;
    const agendaItem = event.active.data.current?.agendaItem as AgendaItem | undefined;
    if (bankSession) {
      setActiveDrag(bankSession);
      setActiveDragType("bank");
    } else if (agendaItem) {
      setActiveDrag(agendaItem);
      setActiveDragType("agenda");
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDrag(null);
    setActiveDragType(null);
    const { over, active } = event;
    if (!over) return;

    const dropData = over.data.current as { dayNumber: number; slotTime: string } | undefined;
    if (!dropData) return;
    const { dayNumber, slotTime } = dropData;

    // Determine if this is a bank → calendar (new) or calendar → calendar (move)
    const bankSession = active.data.current?.session as BankSession | undefined;
    const agendaItem = active.data.current?.agendaItem as AgendaItem | undefined;

    const sessionTitle = bankSession?.title ?? agendaItem?.title ?? "";
    const sessionType = bankSession?.session_type ?? agendaItem?.session_type ?? "session";
    const durationMin = bankSession
      ? bankSession.duration_minutes
      : agendaItem
      ? timeToMinutes(agendaItem.end_time) - timeToMinutes(agendaItem.start_time)
      : 60;

    const startMin = timeToMinutes(slotTime);
    const endMin = startMin + durationMin;

    if (endMin > 17 * 60) {
      toast.error("Session would extend past 5:00 PM");
      return;
    }

    const lunchStart = 12 * 60;
    const lunchEnd = 13 * 60;
    if (startMin < lunchEnd && endMin > lunchStart) {
      toast.error("Session overlaps with lunch (12–1 PM)");
      return;
    }

    // Check overlaps (exclude the item being moved)
    const dayItems = agendaData?.items?.filter((i: any) => i.day_number === dayNumber && i.id !== agendaItem?.id) ?? [];
    const hasOverlap = dayItems.some((item: any) => {
      const iStart = timeToMinutes(item.start_time);
      const iEnd = timeToMinutes(item.end_time);
      return startMin < iEnd && endMin > iStart;
    });

    if (hasOverlap) {
      toast.error("Time slot already occupied");
      return;
    }

    const endHour = Math.floor(endMin / 60);
    const endMinRemainder = endMin % 60;
    const endTime = `${endHour.toString().padStart(2, "0")}:${endMinRemainder.toString().padStart(2, "0")}`;

    try {
      if (agendaItem) {
        // Move existing agenda item
        await moveItem({ id: agendaItem.id, day_number: dayNumber, start_time: slotTime, end_time: endTime });
        toast.success(`Moved "${agendaItem.title}"`);
      } else if (bankSession) {
        // Create new from bank
        await scheduleSession({
          session_bank_id: bankSession.id,
          day_number: dayNumber,
          start_time: slotTime,
          end_time: endTime,
          title: bankSession.title,
          session_type: bankSession.session_type,
        });
        toast.success(`Scheduled "${bankSession.title}"`);
      }
      refetchAgenda();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Failed: " + message);
    }
  }, [agendaData, scheduleSession, moveItem, refetchAgenda]);

  const handleRemoveItem = useCallback(async (id: number) => {
    try {
      await removeItem({ id });
      toast.success("Removed from schedule");
      refetchAgenda();
    } catch (err) {
      toast.error("Failed to remove item");
    }
  }, [removeItem, refetchAgenda]);

  const handleClearDay = useCallback(async (dayNumber: number) => {
    try {
      const result = await clearDay({ day_number: dayNumber });
      toast.success(`Cleared ${(result as any)?.removed ?? 0} items from ${DAY_LABELS[dayNumber]} (Lunch kept)`);
      refetchAgenda();
    } catch (err) {
      toast.error("Failed to clear day");
    }
  }, [clearDay, refetchAgenda]);

  const loading = camperLoading || configLoading || bankLoading || agendaLoading;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-7xl">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!camperData?.isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Icon icon="calendar" className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Register First</h2>
        <p className="text-sm text-muted-foreground">
          Head to Base Camp to register before viewing the agenda.
        </p>
      </div>
    );
  }

  const sessions = bankData?.sessions ?? [];
  const agendaItems = agendaData?.items ?? [];

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4 p-6 max-w-7xl">
        {/* Admin controls */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Days:</span>
            <Select value={String(effectiveDays)} onValueChange={handleDaysChange}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 (Mon–Wed)</SelectItem>
                <SelectItem value="4">4 (Mon–Thu)</SelectItem>
                <SelectItem value="5">5 (Mon–Fri)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground italic">All times in Pacific Time (PT)</p>

        {/* Main layout */}
        <div className={`flex gap-6 ${agendaFetching && !agendaLoading ? "opacity-70" : ""}`}>
          {/* Schedule grid */}
          <div className="flex-1 overflow-hidden">
            <Card className="p-4 flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
              {/* Sticky day headers */}
              <div className="flex flex-shrink-0">
                <div className="w-16 flex-shrink-0" />
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${effectiveDays}, 1fr)`, gap: "4px" }}>
                  {Array.from({ length: effectiveDays }, (_, i) => i + 1).map((day) => (
                    <div key={day} className="flex items-center justify-center gap-1 h-10 border-b border-border bg-muted/30 rounded-t-lg relative">
                      <span className="text-sm font-semibold">{DAY_LABELS[day]}</span>
                      {isAdmin && agendaItems.some((item: any) => item.day_number === day) && (
                        <button
                          onClick={() => handleClearDay(day)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Clear day (keep lunch)"
                        >
                          <Icon icon="trash-2" className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Scrollable time grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex">
                  <div className="w-16 flex-shrink-0">
                    {TIME_LABELS.map((label, idx) => (
                      <div key={idx} className="h-[80px] flex items-start">
                        <span className="text-[10px] text-muted-foreground -mt-1.5">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${effectiveDays}, 1fr)`, gap: "4px" }}>
                    {Array.from({ length: effectiveDays }, (_, i) => i + 1).map((day) => (
                      <DaySchedule
                        key={day}
                        dayNumber={day}
                        dayLabel={DAY_LABELS[day]}
                        items={agendaItems.filter((item: any) => item.day_number === day)}
                        isAdmin={isAdmin}
                        onRemoveItem={handleRemoveItem}
                        onClearDay={handleClearDay}
                        showHeader={false}
                        currentTimeMinutes={currentDayNumber === day ? currentTimeMinutes : null}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Session bank sidebar - admin only */}
          {isAdmin && (
            <div className="w-[280px] flex-shrink-0">
              <Card className="p-4 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
                <SessionBankPanel sessions={sessions} onSessionCreated={refetchBank} />
              </Card>
            </div>
          )}
        </div>

        {/* Resources panel */}
        <AgendaResources
          agendaItems={agendaItems}
          isAdmin={isAdmin}
          camperId={camperId}
        />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDrag && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-camp-green bg-card shadow-lg">
            <Icon icon={activeDragType === "agenda" ? "move" : "presentation"} className="w-3.5 h-3.5 text-camp-green" />
            <span className="text-xs font-medium">{activeDrag.title}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {activeDragType === "bank" && "duration_minutes" in activeDrag
                ? (activeDrag as BankSession).duration_minutes >= 60
                  ? `${(activeDrag as BankSession).duration_minutes / 60}h`
                  : `${(activeDrag as BankSession).duration_minutes}m`
                : activeDragType === "agenda" && "start_time" in activeDrag
                ? (() => {
                    const d = timeToMinutes((activeDrag as AgendaItem).end_time) - timeToMinutes((activeDrag as AgendaItem).start_time);
                    return d >= 60 ? `${d / 60}h` : `${d}m`;
                  })()
                : ""}
            </Badge>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
