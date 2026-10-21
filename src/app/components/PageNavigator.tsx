"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE, safePageSize } from "@/lib/pageSize";

// Previous/next pager with icon buttons (44px touch targets on phones),
// shared by the expenses list and the summary.
export default function PageNavigator({
  page,
  totalPages,
  onPrev,
  onNext,
  pageSize,
  onPageSizeChange,
  className = "",
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  /** Rows per page; pass with onPageSizeChange to show the selector. */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}) {
  const sizeId = useId();
  const button =
    "flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:border-navy-100 disabled:text-navy-300 disabled:hover:bg-transparent cursor-pointer transition-colors";
  return (
    <div className={`flex items-center justify-between gap-3 px-1 ${className}`}>
      <span className="text-cell text-navy-500 tabular-nums">
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {pageSize != null && onPageSizeChange && (
          <PageSizeInput id={sizeId} value={pageSize} onChange={onPageSizeChange} />
        )}
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Página anterior"
          className={button}
        >
          <Icon icon="solar:alt-arrow-left-linear" fontSize={ICON_SIZE} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
          className={button}
        >
          <Icon icon="solar:alt-arrow-right-linear" fontSize={ICON_SIZE} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Rows-per-page field: digits only, any whole number up to MAX_PAGE_SIZE.
 * Applies once typing pauses (COMMIT_DELAY_MS), on Enter, or when leaving the
 * field, so typing "50" doesn't fetch a page of 5 first.
 */
const COMMIT_DELAY_MS = 800;

function PageSizeInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (size: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  // Latest callback without restarting the typing timer on every parent render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const commit = () => {
    if (draft === "") {
      setDraft(String(value));
      return;
    }
    const next = safePageSize(draft);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  // Apply after the user stops typing; an empty field waits for a number.
  useEffect(() => {
    if (draft === "" || Number(draft) === value) return;
    const t = setTimeout(() => {
      const next = safePageSize(draft);
      setDraft(String(next));
      if (next !== value) onChangeRef.current(next);
    }, COMMIT_DELAY_MS);
    return () => clearTimeout(t);
  }, [draft, value]);

  return (
    <div className="mr-2 flex items-center gap-2">
      <label htmlFor={id} className="hidden text-cell text-navy-500 sm:inline">
        Filas por página
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") setDraft(String(value));
        }}
        aria-label={`Filas por página (de ${MIN_PAGE_SIZE} a ${MAX_PAGE_SIZE})`}
        title={`De ${MIN_PAGE_SIZE} a ${MAX_PAGE_SIZE} filas`}
        className="h-11 w-16 sm:h-9 rounded-lg border border-navy-200 bg-white px-2 text-center text-cell text-navy-700 tabular-nums transition-colors hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      />
    </div>
  );
}
