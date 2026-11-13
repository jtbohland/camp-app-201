import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { queryClient } from "@superblocksteam/library";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi.js";
import { useApiData } from "@/hooks/useApiData.js";
import { errorMessage } from "@/lib/cohortRefresh";
import ScheduleCard from "@/components/ScheduleCard/index.js";
import ScheduleColumn from "@/components/ScheduleColumn/index.js";
import PresentationEditorSheet from "@/components/PresentationEditorSheet/index.js";
import {
  DAY_NAMES,
  itemsIn,
  moveItem,
  outOfRange,
  slotOf,
  type ScheduleItem,
  type Slot,
} from "@/lib/presentationSchedule";

type BoardData = { num_days: number; items: ScheduleItem[] };

// Full class names so Tailwind includes them (it can't see `xl:grid-cols-${n}`).
const XL_COLS: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};

/**
 * Counselor Hub › Presentations: decide which presentations show in the app and on which day.
 * Days match the Agenda. Everything not on a day sits in the bank (hidden from cAMPers).
 */
export default function AdminPresentations() {
  const { data, loading, fetching, refetch } = useApiData("GetPresentationSchedule", {});
  const { run: saveLayout } = useApi("SavePresentationSchedule");
  const { run: toggleLock } = useApi("TogglePresentationLock");
  const { run: createPres, loading: creating } = useApi("CreatePresentation");
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const cacheKey = useMemo(() => queryClient.buildCacheKey("GetPresentationSchedule", {}), []);
  const numDays = data?.num_days ?? 3;
  const items = (data?.items ?? []) as ScheduleItem[];
  const days = useMemo(() => Array.from({ length: numDays }, (_, i) => i + 1), [numDays]);
  const stranded = useMemo(() => outOfRange(items, numDays), [items, numDays]);
  const bank = useMemo(() => itemsIn(items, "bank"), [items]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /** Every screen that lists presentations should pick up the change. */
  const refreshAll = useCallback(async () => {
    await refetch();
    await queryClient.invalidateQueries("GetPresentations");
  }, [refetch]);

  /** Apply a new layout instantly, save only the cards that changed, roll back on failure. */
  const applyLayout = useCallback(
    async (next: ScheduleItem[], successMsg?: string) => {
      const prev = queryClient.getQueryData<BoardData>(cacheKey);
      if (!prev) return;
      const before = new Map(prev.items.map((i) => [i.id, i]));
      const changed = next.filter((i) => {
        const b = before.get(i.id);
        return !b || b.day_number !== i.day_number || b.sort_order !== i.sort_order;
      });
      if (changed.length === 0) return;
      queryClient.setQueryData<BoardData>(cacheKey, { ...prev, items: next });
      try {
        await saveLayout({
          layout: changed.map((i) => ({ id: i.id, day_number: i.day_number, sort_order: i.sort_order })),
        });
        if (successMsg) toast.success(successMsg);
        await refreshAll();
      } catch (e) {
        queryClient.setQueryData<BoardData>(cacheKey, prev);
        toast.error("Couldn't save the schedule: " + errorMessage(e));
      }
    },
    [cacheKey, saveLayout, refreshAll],
  );

  const handleMoveTo = useCallback(
    (item: ScheduleItem, slot: Slot) => {
      const msg = slot === "bank" ? `"${item.title}" removed from the app` : `"${item.title}" moved to ${DAY_NAMES[slot]}`;
      applyLayout(moveItem(items, item.id, slot), msg);
    },
    [items, applyLayout],
  );

  const handleShift = useCallback(
    (item: ScheduleItem, delta: -1 | 1) => {
      const slot = slotOf(item);
      const list = itemsIn(items, slot);
      const idx = list.findIndex((i) => i.id === item.id);
      applyLayout(moveItem(items, item.id, slot, idx + delta));
    },
    [items, applyLayout],
  );

  const handleToggleLock = useCallback(
    async (item: ScheduleItem) => {
      const prev = queryClient.getQueryData<BoardData>(cacheKey);
      if (prev) {
        queryClient.setQueryData<BoardData>(cacheKey, {
          ...prev,
          items: prev.items.map((i) => (i.id === item.id ? { ...i, is_locked: !item.is_locked } : i)),
        });
      }
      try {
        await toggleLock({ presentation_id: item.id, is_locked: !item.is_locked });
        toast.success(item.is_locked ? `"${item.title}" unlocked for cAMPers` : `"${item.title}" locked for cAMPers`);
        await refreshAll();
      } catch (e) {
        if (prev) queryClient.setQueryData<BoardData>(cacheKey, prev);
        toast.error("Couldn't change the lock: " + errorMessage(e));
      }
    },
    [cacheKey, toggleLock, refreshAll],
  );

  const handleCreate = useCallback(async () => {
    try {
      const res = await createPres({
        title: "New Presentation",
        description: null,
        instructions: null,
        resources: null,
        prep_time_minutes: 30,
        present_time_minutes: 10,
        team_id: null,
        day_number: null,
        created_by: 0,
      });
      await refetch();
      const fresh = queryClient.getQueryData<BoardData>(cacheKey)?.items.find((i) => i.id === res?.id);
      if (fresh) setEditing(fresh);
      toast.success("Added to the bank. Fill in the details, then drag it onto a day.");
    } catch (e) {
      toast.error("Couldn't create: " + errorMessage(e));
    }
  }, [createPres, refetch, cacheKey]);

  const handleDragStart = useCallback((e: DragStartEvent) => setDragId(Number(e.active.id)), []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setDragId(null);
      const { active, over } = e;
      if (!over) return;
      const id = Number(active.id);
      const overSlot = over.data.current?.slot as Slot | undefined;
      // Dropped on a column body → end of that column. Dropped on a card → that card's position.
      if (overSlot !== undefined) {
        applyLayout(moveItem(items, id, overSlot));
        return;
      }
      const overItem = items.find((i) => i.id === Number(over.id));
      if (!overItem || overItem.id === id) return;
      const slot = slotOf(overItem);
      const index = itemsIn(items, slot).findIndex((i) => i.id === overItem.id);
      applyLayout(moveItem(items, id, slot, index));
    },
    [items, applyLayout],
  );

  const dragging = dragId !== null ? items.find((i) => i.id === dragId) ?? null : null;

  const renderCards = (slot: Slot) => {
    const list = itemsIn(items, slot);
    return list.map((item, idx) => (
      <ScheduleCard
        key={item.id}
        item={item}
        position={slot === "bank" ? null : idx + 1}
        numDays={numDays}
        canMoveUp={idx > 0}
        canMoveDown={idx < list.length - 1}
        onMoveTo={(s) => handleMoveTo(item, s)}
        onShift={(d) => handleShift(item, d)}
        onEdit={() => setEditing(item)}
        onToggleLock={() => handleToggleLock(item)}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Icon icon="presentation" className="h-5 w-5" />
            Presentations
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag presentations onto a day to show them in the app, or back to the bank to hide them. Days match the Agenda ({numDays} days).
          </p>
        </div>
        {fetching && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>

      {stranded.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Icon icon="triangle-alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {stranded.length} presentation{stranded.length === 1 ? " is" : "s are"} on a day that's no longer on the Agenda
            ({stranded.map((s) => s.title).join(", ")}). cAMPers can't see {stranded.length === 1 ? "it" : "them"}.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 shrink-0"
            onClick={() => applyLayout(stranded.reduce((acc, s) => moveItem(acc, s.id, "bank"), items), "Moved to the bank")}
          >
            Move to bank
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragId(null)}>
        <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${XL_COLS[numDays] ?? "xl:grid-cols-3"} ${fetching ? "opacity-90" : ""}`}>
          {days.map((d) => (
            <ScheduleColumn
              key={d}
              slot={d}
              title={`Day ${d}`}
              subtitle={DAY_NAMES[d]}
              itemIds={itemsIn(items, d).map((i) => i.id)}
              emptyText="Drag a presentation here"
            >
              {renderCards(d)}
            </ScheduleColumn>
          ))}
        </div>

        <ScheduleColumn
          slot="bank"
          variant="bank"
          title="Presentation Bank"
          subtitle="Built but not showing in the app. Drag one onto a day to add it."
          itemIds={bank.map((i) => i.id)}
          emptyText="Everything is scheduled. Drag a card here to remove it from the app."
          action={
            <Button size="sm" onClick={handleCreate} disabled={creating} className="h-7 bg-purple-600 text-white hover:bg-purple-700">
              <Icon icon="plus" className="mr-1 h-3.5 w-3.5" />
              {creating ? "Creating…" : "New"}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{renderCards("bank")}</div>
        </ScheduleColumn>

        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="flex items-center gap-2 rounded-lg border border-primary bg-card px-3 py-2 shadow-lg">
              <Icon icon="grip-vertical" className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{dragging.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <p className="text-[11px] text-muted-foreground">
        Tip: use a card's <Icon icon="ellipsis-vertical" className="-mt-0.5 inline h-3 w-3" /> menu to move it without dragging.
        The lock controls whether cAMPers can open it on the day it shows.
      </p>

      <PresentationEditorSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await refreshAll();
        }}
      />
    </div>
  );
}
