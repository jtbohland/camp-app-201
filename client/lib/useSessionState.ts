import { useCallback, useState } from "react";

/**
 * Like useState, but remembered for the browser tab, so a list keeps its search/sort/page when the
 * user opens a detail view and comes back. Falls back to plain state if storage is unavailable.
 */
export function useSessionState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.sessionStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage full or blocked: keep the in-memory value.
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set];
}
