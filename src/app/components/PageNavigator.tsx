"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";
import LoadingSwap from "./LoadingSwap";
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
  loading = false,
  className = "",
}: {
  page: number;
  /** null while still unknown (first load): shown as "–", never a made-up 1. */
  totalPages: number | null;
  onPrev: () => void;
  onNext: () => void;
  /** Rows per page; pass with onPageSizeChange to show the selector. */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  /**
   * True while the list waits for results that aren't cached yet (a new page,
   * filter, search or page size): the current page number shows loading dots.
   * Use SWR `isLoading`, not `isValidating`, so a cached page shows no dots.
   */
  loading?: boolean;
  className?: string;
}) {
  const sizeId = useId();
  // Both numbers get the width of the longest possible one (the total; digits
  // are tabular, so 1ch each), and at least room for the loading dots. The "/"
  // then stays centered for 2 / 9, 12 / 35 or 7 / 120 alike.
  const slot = { minWidth: `${Math.max(String(totalPages ?? page).length, 2.5)}ch` };

  // Arrows sit inside one shared border with the page count, so the three
  // read as a single control (‹ 2 / 9 ›).
  const button =
    "flex w-11 sm:w-9.5 items-center justify-center text-navy-700 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:text-navy-300 disabled:hover:bg-transparent cursor-pointer transition-colors";
  return (
    <div className={`flex items-center justify-end gap-2 px-1 ${className}`}>
      {pageSize != null && onPageSizeChange && (
        <PageSizeInput id={sizeId} value={pageSize} onChange={onPageSizeChange} />
      )}
      <div
        role="group"
        aria-label="Paginación"
        // Standard control height, like inputs and buttons (44px phones, 38px from sm);
        // the arrows fill it from inside.
        className="flex h-11 items-stretch overflow-hidden rounded-lg border border-navy-200 bg-white sm:h-9.5"
      >
        <PagerButton direction="prev" disabled={page <= 1} onClick={onPrev} className={button} />
        {/* Fixed width so the arrows don't move as the numbers grow (9 → 10 → 100). */}
        <span
          aria-live="polite"
          aria-label={totalPages ? `Página ${page} de ${totalPages}` : `Página ${page}`}
          className="flex min-w-14 items-center justify-center px-1 text-cell text-navy-700 tabular-nums"
        >
          {/* While loading, the current page number turns into the loading dots. */}
          <span className="inline-flex justify-center" style={slot}>
            <LoadingSwap busy={loading}>{page}</LoadingSwap>
          </span>
          <span className="px-1">/</span>
          {/* Same slot as the current page, so the "/" stays centered. */}
          <span
            className={`inline-flex justify-center ${totalPages ? "" : "text-navy-300"}`}
            style={slot}
          >
            {totalPages ?? "–"}
          </span>
        </span>
        <PagerButton
          direction="next"
          // Unknown total: there may or may not be a next page yet.
          disabled={totalPages === null || page >= totalPages}
          onClick={onNext}
          className={button}
        />
      </div>
    </div>
  );
}

/** Pager arrow button (‹ or ›). */
function PagerButton({
  direction,
  disabled,
  onClick,
  className,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Página anterior" : "Página siguiente"}
      className={className}
    >
      <Icon
        icon={direction === "prev" ? "solar:alt-arrow-left-linear" : "solar:alt-arrow-right-linear"}
        fontSize={ICON_SIZE}
        aria-hidden
      />
    </button>
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
        className="h-11 w-16 sm:h-9.5 rounded-lg border border-navy-200 bg-white px-2 text-center text-cell text-navy-700 tabular-nums transition-colors hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      />
    </div>
  );
}
