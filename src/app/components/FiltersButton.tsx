"use client";

/**
 * "Filtros" toggle for list screens. Pressed look while the panel is open,
 * violet text when filters are applied but the panel is closed.
 *
 * Colors are set per state here (not layered on SECONDARY_BUTTON_CLASS), since
 * two utilities for the same property don't reliably override each other.
 */
export default function FiltersButton({
  open,
  count,
  controls,
  onClick,
}: {
  open: boolean;
  /** Number of filters applied from the panel; shown as a badge. */
  count: number;
  /** id of the panel this button shows/hides. */
  controls: string;
  onClick: () => void;
}) {
  const state = open
    ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
    : count > 0
      ? "border-violet-300 bg-white text-violet-700 hover:bg-violet-50"
      : "border-zinc-200 bg-white text-zinc-700 hover:bg-violet-50 hover:text-violet-700";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={`inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:min-h-0 sm:flex-none ${state}`}
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
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="10" y1="18" x2="14" y2="18" />
      </svg>
      Filtros
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${
            open ? "bg-white text-violet-700" : "bg-violet-600 text-white"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
