"use client";

import { useEffect, useState } from "react";
import { usePageSize } from "./usePageSize";

/**
 * Pages a list that's already in memory, with the shared rows-per-page
 * preference. Goes back to page 1 whenever `resetKey` changes (e.g. filters).
 * Spread `pager` into <PageNavigator />.
 */
export function useClientPagination<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizePref] = usePageSize();

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp, so deleting the last row of the last page doesn't leave an empty page.
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;

  return {
    rows: items.slice(start, start + pageSize),
    /** Number of rows before this page, for the "#" column. */
    start,
    pager: {
      page: current,
      totalPages,
      onPrev: () => setPage(Math.max(1, current - 1)),
      onNext: () => setPage(Math.min(totalPages, current + 1)),
      pageSize,
      onPageSizeChange: (size: number) => {
        setPageSizePref(size);
        setPage(1);
      },
    },
  };
}
