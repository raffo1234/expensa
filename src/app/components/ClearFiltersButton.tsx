"use client";

import InputWithTooltip from "./InputWithTooltip";

export default function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <InputWithTooltip label="Limpiar filtros">
      <button
        type="button"
        onClick={onClick}
        aria-label="Limpiar filtros"
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors cursor-pointer"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          <line x1="4" y1="21" x2="21" y2="4" />
        </svg>
      </button>
    </InputWithTooltip>
  );
}
