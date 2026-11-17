import { useCallback, useState } from "react";

function read<T>(key: string, initial: T): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial;
  }
}

/**
 * Like useState, but remembered for the browser tab, so a list keeps its search/sort/page when the
 * user opens a detail view and comes back. Falls back to plain state if storage is unavailable.
 * When the key changes (e.g. a different survey day), the value for the new key is loaded.
 */
export function useSessionState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<{ key: string; value: T }>(() => ({ key, value: read(key, initial) }));

  // Key changed: switch to the stored value for the new key during render (no flash of old data).
  let current = state;
  if (state.key !== key) {
    current = { key, value: read(key, initial) };
    setState(current);
  }

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const base = prev.key === key ? prev.value : read(key, initial);
        const resolved = typeof next === "function" ? (next as (p: T) => T)(base) : next;
        try {
          window.sessionStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage full or blocked: keep the in-memory value.
        }
        return { key, value: resolved };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [current.value, set];
}
