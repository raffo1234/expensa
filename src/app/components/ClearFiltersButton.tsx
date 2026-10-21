"use client";

import InputWithTooltip from "./InputWithTooltip";

/**
 * Icon-only "clear filters" button with a tooltip. Always rendered (disabled
 * when there's nothing to clear) so the filter row never shifts. Sized to match
 * the secondary "Filtros" button next to it.
 */
export default function ClearFiltersButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <InputWithTooltip label="Limpiar filtros">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label="Limpiar filtros"
        className="flex size-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:border-navy-100 disabled:text-navy-300 disabled:hover:bg-white sm:size-9.5"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          <line x1="4" y1="21" x2="21" y2="4" />
        </svg>
      </button>
    </InputWithTooltip>
  );
}
