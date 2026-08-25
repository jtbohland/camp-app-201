import { useState, useCallback, useMemo } from "react";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { queryClient } from "@superblocksteam/library";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import SessionBankPanel, { type BankSession } from "@/components/SessionBankPanel";
import DaySchedule, { type AgendaItem, timeToMinutes } from "@/components/DaySchedule";

const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

const TIME_LABELS: string[] = [];
for (let h = 9; h <= 17; h++) {
  const hour = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  TIME_LABELS.push(`${hour}:00 ${ampm}`);
}

export default function AgendaPage() {
  const user = useSuperblocksUser();

  // Load camper data to check role
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  // Load camp config
  const { data: configData, loading: configLoading } = useApiData("GetCampConfig", {});

  // Load session bank
  const { data: bankData, loading: bankLoading, refetch: refetchBank } = useApiData("GetSessionBank", {});

  // Load agenda
  const { data: agendaData, loading: agendaLoading, fetching: agendaFetching, refetch: refetchAgenda } = useApiData("GetAgenda", {});

  // Mutations
  const { run: scheduleSession } = useApi("ScheduleSession");
  const { run: removeItem } = useApi("RemoveAgendaItem");
  const { run: updateConfig } = useApi("UpdateCampConfig");

  // State
  const [numDays, setNumDays] = useState<number | null>(null);
  const [activeDrag, setActiveDrag] = useState<BankSession | null>(null);

  // Determine role
  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";

  // Determine camp days from config
  const configDays = useMemo(() => {
    if (configData?.config) {
      const dayConfig = configData.config.find((c) => c.key === "num_days");
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

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const session = event.active.data.current?.session as BankSession | undefined;
    if (session) setActiveDrag(session);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDrag(null);
    const { over, active } = event;
    if (!over) return;

    const session = active.data.current?.session as BankSession | undefined;
    if (!session) return;

    const dropData = over.data.current as { dayNumber: number; slotTime: string } | undefined;
    if (!dropData) return;

    const { dayNumber, slotTime } = dropData;

    // Calculate end time based on session duration
    const startMin = timeToMinutes(slotTime);
    const endMin = startMin + session.duration_minutes;

    // Don't allow overflow past 5pm
    if (endMin > 17 * 60) {
      toast.error("Session would extend past 5:00 PM");
      return;
    }

    // Don't allow overlap with lunch (12:00-13:00)
    const lunchStart = 12 * 60;
    const lunchEnd = 13 * 60;
    if (startMin < lunchEnd && endMin > lunchStart) {
      toast.error("Session overlaps with lunch (12–1 PM)");
      return;
    }

    // Check overlap with existing items
    const dayItems = agendaData?.items?.filter((i) => i.day_number === dayNumber) ?? [];
    const hasOverlap = dayItems.some((item) => {
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
      await scheduleSession({
        session_bank_id: session.id,
        day_number: dayNumber,
        start_time: slotTime,
        end_time: endTime,
        title: session.title,
        session_type: session.session_type,
      });
      toast.success(`Scheduled "${session.title}"`);
      refetchAgenda();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Failed to schedule: " + message);
    }
  }, [agendaData, scheduleSession, refetchAgenda]);

  const handleRemoveItem = useCallback(async (id: number) => {
    try {
      await removeItem({ id });
      toast.success("Removed from schedule");
      refetchAgenda();
    } catch (err) {
      toast.error("Failed to remove item");
    }
  }, [removeItem, refetchAgenda]);

  // Loading state
  const loading = camperLoading || configLoading || bankLoading || agendaLoading;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-7xl">
        <Skeleton className="h-10 w-48" />
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
      <div className="flex flex-col gap-6 p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Icon icon="calendar" className="w-6 h-6 text-camp-amber" />
              cAMP Agenda
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Drag sessions from the bank onto the schedule" : "Your cAMP 201 daily schedule"}
            </p>
          </div>

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
        </div>

        {/* Main layout */}
        <div className={`flex gap-6 ${agendaFetching && !agendaLoading ? "opacity-70" : ""}`}>
          {/* Schedule grid */}
          <div className="flex-1 overflow-auto">
            <Card className="p-4">
              <div className="flex">
                {/* Time labels column */}
                <div className="w-16 flex-shrink-0 pt-[33px]">
                  {TIME_LABELS.map((label, idx) => (
                    <div key={idx} className="h-[80px] flex items-start">
                      <span className="text-[10px] text-muted-foreground -mt-1.5">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${effectiveDays}, 1fr)`, gap: "4px" }}>
                  {Array.from({ length: effectiveDays }, (_, i) => i + 1).map((day) => (
                    <DaySchedule
                      key={day}
                      dayNumber={day}
                      dayLabel={DAY_LABELS[day]}
                      items={agendaItems.filter((item) => item.day_number === day)}
                      isAdmin={isAdmin}
                      onRemoveItem={handleRemoveItem}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Session bank sidebar - admin only */}
          {isAdmin && (
            <div className="w-[260px] flex-shrink-0">
              <Card className="p-4 h-[680px] overflow-hidden flex flex-col">
                <SessionBankPanel sessions={sessions} onSessionCreated={refetchBank} />
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDrag && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-camp-green bg-card shadow-lg">
            <Icon icon="presentation" className="w-3.5 h-3.5 text-camp-green" />
            <span className="text-xs font-medium">{activeDrag.title}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {activeDrag.duration_minutes >= 60
                ? `${activeDrag.duration_minutes / 60}h`
                : `${activeDrag.duration_minutes}m`}
            </Badge>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
