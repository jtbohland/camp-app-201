import { useCallback, useMemo, useState } from "react";
import type { RemovableEntry } from "./index.js";

type EntryLike = { points: number; category: string | null; reversed: boolean; is_reversal: boolean };

/** Same rule as the Remove button: not already removed, not a correction, not zero, not a team award. */
export function isRemovable(e: EntryLike): boolean {
  return !e.reversed && !e.is_reversal && e.points !== 0 && e.category !== "team_award";
}

/** Tracks which point entries a counselor has checked for bulk removal. */
export function useEntrySelection() {
  const [selected, setSelected] = useState<Map<number, RemovableEntry>>(new Map());

  const toggle = useCallback((entry: RemovableEntry) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.set(entry.id, entry);
      return next;
    });
  }, []);

  /** Select every given entry, or clear them if they're all already selected. */
  const toggleAll = useCallback((entries: RemovableEntry[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const allOn = entries.length > 0 && entries.every((e) => next.has(e.id));
      for (const e of entries) {
        if (allOn) next.delete(e.id);
        else next.set(e.id, e);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Map()), []);
  /** Unselect specific entries (e.g. after they were removed). */
  const drop = useCallback((ids: number[]) => {
    setSelected((prev) => {
      if (!ids.some((id) => prev.has(id))) return prev;
      const next = new Map(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);
  const list = useMemo(() => [...selected.values()], [selected]);
  const netChange = useMemo(() => -list.reduce((s, e) => s + e.points, 0), [list]);
  const isSelected = useCallback((id: number) => selected.has(id), [selected]);

  return { list, count: list.length, netChange, toggle, toggleAll, clear, drop, isSelected };
}
