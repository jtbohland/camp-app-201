import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSuperblocksUser, queryClient } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SessionBankPanel, { type BankSession } from "@/components/SessionBankPanel";
import DaySchedule, {
  type AgendaItem,
  TimeGutter,
  timeToMinutes,
  minutesToTime,
  formatTime,
  GRID_START_MIN,
  PX_PER_MIN,
} from "@/components/DaySchedule";
import AgendaResources from "@/components/AgendaResources/index.js";
import ConfirmRemoveDialog from "@/components/ConfirmRemoveDialog/index.js";
import EditAgendaItemDialog from "@/components/EditAgendaItemDialog/index.js";
import { findSlotConflict, eventPoint } from "@/lib/agendaRules";

const SNAP_MIN = 15;

function errMsg(err: unknown) {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

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
  const [pendingRemove, setPendingRemove] = useState<{ id: number; title: string } | null>(null);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  // For calendar moves: how far below the block's top edge the cursor grabbed it (in minutes).
  const grabOffsetRef = useRef(0);
  // Real cursor position during a drag (dnd-kit's delta also adds scroll, which double-counted).
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const pointerListenerRef = useRef<((e: PointerEvent) => void) | null>(null);
  // Live "this is where it will land" ghost on the calendar.
  const [dropPreview, setDropPreview] = useState<
    { dayNumber: number; startMin: number; endMin: number; conflict: string | null } | null
  >(null);
  // Ignore the stray click some browsers fire right after a drag ends.
  const lastDragEndRef = useRef(0);
  const openEditor = useCallback((item: AgendaItem) => {
    if (Date.now() - lastDragEndRef.current < 300) return;
    setEditingItem(item);
  }, []);

  // Require a small drag distance so clicks (like the remove button) still register as clicks.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const agendaKey = useMemo(() => queryClient.buildCacheKey("GetAgenda", {}), []);
  /** Optimistically change the cached agenda; returns the previous value for rollback. */
  const patchAgenda = useCallback((fn: (items: AgendaItem[]) => AgendaItem[]) => {
    const prev = queryClient.getQueryData(agendaKey) as { items: AgendaItem[] } | undefined;
    if (prev) queryClient.setQueryData(agendaKey, { ...prev, items: fn(prev.items) });
    return prev;
  }, [agendaKey]);

  const { isAdmin } = useIsAdmin();
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

  const stopTrackingPointer = useCallback(() => {
    if (pointerListenerRef.current) window.removeEventListener("pointermove", pointerListenerRef.current);
    pointerListenerRef.current = null;
  }, []);
  useEffect(() => stopTrackingPointer, [stopTrackingPointer]);

  /** Snapped start/end (in minutes) for the dragged session if dropped on this day right now. */
  const computeTarget = useCallback((dayNumber: number, durationMin: number, isMove: boolean) => {
    const column = document.getElementById(`day-col-${dayNumber}`);
    const p = pointerRef.current;
    if (!column || !p) return null;
    const cursorMin = GRID_START_MIN + (p.y - column.getBoundingClientRect().top) / PX_PER_MIN;
    // Bank sessions start at the cursor; calendar moves keep the spot you grabbed the block by.
    const rawStart = isMove ? cursorMin - grabOffsetRef.current : cursorMin;
    const startMin = Math.round(rawStart / SNAP_MIN) * SNAP_MIN;
    return { startMin, endMin: startMin + durationMin };
  }, []);

  const dragDuration = (bank?: BankSession, item?: AgendaItem) =>
    bank
      ? Number(bank.duration_minutes) || 30
      : item
      ? timeToMinutes(item.end_time) - timeToMinutes(item.start_time)
      : 60;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const bankSession = event.active.data.current?.session as BankSession | undefined;
    const agendaItem = event.active.data.current?.agendaItem as AgendaItem | undefined;
    grabOffsetRef.current = 0;
    pointerRef.current = eventPoint(event.activatorEvent);
    stopTrackingPointer();
    const onMove = (e: PointerEvent) => { pointerRef.current = { x: e.clientX, y: e.clientY }; };
    pointerListenerRef.current = onMove;
    window.addEventListener("pointermove", onMove);

    if (bankSession) {
      setActiveDrag(bankSession);
      setActiveDragType("bank");
    } else if (agendaItem) {
      setActiveDrag(agendaItem);
      setActiveDragType("agenda");
      const p = pointerRef.current;
      const blockTop = event.active.rect.current.initial?.top;
      if (p && blockTop !== undefined) grabOffsetRef.current = Math.max(0, (p.y - blockTop) / PX_PER_MIN);
    }
  }, [stopTrackingPointer]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const dayNumber = (event.over?.data.current as { dayNumber?: number } | undefined)?.dayNumber;
    if (!dayNumber) {
      setDropPreview((prev) => (prev ? null : prev));
      return;
    }
    const bankSession = event.active.data.current?.session as BankSession | undefined;
    const agendaItem = event.active.data.current?.agendaItem as AgendaItem | undefined;
    const t = computeTarget(dayNumber, dragDuration(bankSession, agendaItem), !!agendaItem);
    if (!t) return;
    setDropPreview((prev) => {
      if (prev && prev.dayNumber === dayNumber && prev.startMin === t.startMin && prev.endMin === t.endMin) return prev;
      const conflict = findSlotConflict(
        (agendaData?.items ?? []) as AgendaItem[],
        dayNumber,
        t.startMin,
        t.endMin,
        agendaItem?.id
      );
      return { dayNumber, ...t, conflict };
    });
  }, [computeTarget, agendaData]);

  const handleDragCancel = useCallback(() => {
    stopTrackingPointer();
    setActiveDrag(null);
    setActiveDragType(null);
    setDropPreview(null);
  }, [stopTrackingPointer]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    lastDragEndRef.current = Date.now();
    stopTrackingPointer();
    setActiveDrag(null);
    setActiveDragType(null);
    setDropPreview(null);
    const { over, active } = event;
    if (!over) return;

    const bankSession = active.data.current?.session as BankSession | undefined;
    const agendaItem = active.data.current?.agendaItem as AgendaItem | undefined;

    // Scheduled item dropped back on the Session Bank → remove it (after confirming).
    if (over.id === "session-bank") {
      if (agendaItem) setPendingRemove({ id: agendaItem.id, title: agendaItem.title });
      return;
    }

    const dropData = over.data.current as { dayNumber: number } | undefined;
    if (!dropData?.dayNumber) return;
    const { dayNumber } = dropData;

    const target = computeTarget(dayNumber, dragDuration(bankSession, agendaItem), !!agendaItem);
    if (!target) return;
    const { startMin, endMin } = target;
    const slotTime = minutesToTime(Math.max(startMin, 0));

    // Dropped in the same spot — nothing to do.
    if (agendaItem && agendaItem.day_number === dayNumber && agendaItem.start_time.slice(0, 5) === slotTime) return;

    const conflict = findSlotConflict(
      (agendaData?.items ?? []) as AgendaItem[],
      dayNumber,
      startMin,
      endMin,
      agendaItem?.id
    );
    if (conflict) {
      toast.error(`Can't place at ${formatTime(slotTime)}: ${conflict}`);
      return;
    }

    const endTime = minutesToTime(endMin);

    if (agendaItem) {
      // Move: show the new position right away, roll back if the save fails.
      const prev = patchAgenda((items) =>
        items.map((i) => (i.id === agendaItem.id ? { ...i, day_number: dayNumber, start_time: slotTime, end_time: endTime } : i))
      );
      try {
        await moveItem({ id: agendaItem.id, day_number: dayNumber, start_time: slotTime, end_time: endTime });
        toast.success(`Moved "${agendaItem.title}"`);
      } catch (err) {
        if (prev) queryClient.setQueryData(agendaKey, prev);
        toast.error("Couldn't move session: " + errMsg(err));
      }
      refetchAgenda();
      return;
    }

    try {
      if (bankSession) {
        // Always uses the Session Bank's default length.
        await scheduleSession({
          session_bank_id: bankSession.id,
          day_number: dayNumber,
          start_time: slotTime,
          end_time: endTime,
          title: bankSession.title || "Untitled session",
          session_type: bankSession.session_type || "session",
        });
        toast.success(`Scheduled "${bankSession.title}" at ${formatTime(slotTime)}`);
      }
    } catch (err) {
      toast.error(`Couldn't schedule "${bankSession?.title ?? "session"}": ${errMsg(err)}`);
    }
    refetchAgenda();
  }, [agendaData, scheduleSession, moveItem, refetchAgenda, patchAgenda, agendaKey, computeTarget, stopTrackingPointer]);

  // Edit timing of one calendar session (does not change the Session Bank default).
  const handleSaveEdit = useCallback(async (item: AgendaItem, startTime: string, endTime: string) => {
    setSavingEdit(true);
    const prev = patchAgenda((items) =>
      items.map((i) => (i.id === item.id ? { ...i, start_time: startTime, end_time: endTime } : i))
    );
    try {
      await moveItem({ id: item.id, day_number: item.day_number, start_time: startTime, end_time: endTime });
      toast.success(`Updated "${item.title}" to ${formatTime(startTime)} – ${formatTime(endTime)}`);
      setEditingItem(null);
    } catch (err) {
      if (prev) queryClient.setQueryData(agendaKey, prev);
      toast.error("Couldn't update session: " + errMsg(err));
    }
    setSavingEdit(false);
    refetchAgenda();
  }, [patchAgenda, moveItem, agendaKey, refetchAgenda]);

  const editingDefaultMinutes = useMemo(() => {
    if (!editingItem?.session_bank_id) return null;
    const s = bankData?.sessions?.find((b: any) => b.id === editingItem.session_bank_id);
    return s ? Number(s.duration_minutes) : null;
  }, [editingItem, bankData]);

  // The ✕ button asks first; the actual removal happens in confirmRemove.
  const handleRemoveItem = useCallback((id: number) => {
    const item = agendaData?.items?.find((i: any) => i.id === id);
    setPendingRemove({ id, title: item?.title ?? "this session" });
  }, [agendaData]);

  const confirmRemove = useCallback(async () => {
    if (!pendingRemove) return;
    const { id, title } = pendingRemove;
    setPendingRemove(null);
    const prev = patchAgenda((items) => items.filter((i) => i.id !== id));
    try {
      await removeItem({ id });
      toast.success(`Removed "${title}" from schedule`);
    } catch (err) {
      if (prev) queryClient.setQueryData(agendaKey, prev);
      toast.error("Couldn't remove session: " + errMsg(err));
    }
    refetchAgenda();
  }, [pendingRemove, patchAgenda, removeItem, refetchAgenda, agendaKey]);

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
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
                <div className="w-12 flex-shrink-0" />
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
              <div className="flex-1 overflow-y-auto pt-2">
                <div className="flex">
                  <TimeGutter />
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${effectiveDays}, 1fr)`, gap: "4px" }}>
                    {Array.from({ length: effectiveDays }, (_, i) => i + 1).map((day) => (
                      <DaySchedule
                        key={day}
                        dayNumber={day}
                        dayLabel={DAY_LABELS[day]}
                        items={agendaItems.filter((item: any) => item.day_number === day)}
                        isAdmin={isAdmin}
                        onRemoveItem={handleRemoveItem}
                        onEditItem={openEditor}
                        dropPreview={dropPreview?.dayNumber === day ? dropPreview : null}
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
                <SessionBankPanel
                  sessions={sessions}
                  onSessionCreated={refetchBank}
                  showRemoveTarget={activeDragType === "agenda"}
                />
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

      <EditAgendaItemDialog
        item={editingItem}
        allItems={agendaItems as AgendaItem[]}
        defaultMinutes={editingDefaultMinutes}
        saving={savingEdit}
        onCancel={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      <ConfirmRemoveDialog
        title={pendingRemove?.title ?? null}
        onCancel={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
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
