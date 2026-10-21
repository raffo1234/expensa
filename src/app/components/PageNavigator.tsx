import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";

// Previous/next pager with icon buttons (44px touch targets on phones),
// shared by the expenses list and the summary.
export default function PageNavigator({
  page,
  totalPages,
  onPrev,
  onNext,
  className = "",
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  const button =
    "flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors";
  return (
    <div className={`flex items-center justify-between gap-3 px-1 ${className}`}>
      <span className="text-sm text-gray-600 tabular-nums">
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
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
