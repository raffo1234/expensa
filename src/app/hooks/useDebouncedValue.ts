"use client";

import { useEffect, useState } from "react";

/**
 * `value`, but only after it stopped changing for `delay` ms. Inputs stay
 * instant on screen while queries use the settled value, so typing "F001" in
 * a filter sends one request instead of four. Compared by content, so a new
 * object with the same values doesn't restart the wait.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [settled, setSettled] = useState(value);
  const key = JSON.stringify(value);

  useEffect(() => {
    if (key === JSON.stringify(settled)) return;
    const t = setTimeout(() => setSettled(JSON.parse(key) as T), delay);
    return () => clearTimeout(t);
    // `settled` is only compared, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay]);

  return settled;
}
