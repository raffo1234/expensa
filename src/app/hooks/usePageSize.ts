"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE, safePageSize } from "@/lib/pageSize";

// One preference for every list, so choosing 50 rows applies everywhere.
const STORAGE_KEY = "list-page-size";

/**
 * Rows per page, remembered in localStorage. Starts at the default so server
 * and browser render the same HTML, then picks up the saved value after mount.
 */
export function usePageSize(): [number, (size: number) => void] {
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    try {
      setSize(safePageSize(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Storage can be unavailable (private mode, blocked); keep the default.
    }
  }, []);

  const update = (next: number) => {
    const value = safePageSize(next);
    setSize(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  };

  return [size, update];
}
