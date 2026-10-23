import type { GuideStatus } from "@/lib/dispatchGuide";

/**
 * Whether an invoice has its guía de remisión. "Falta" uses the warning color
 * with an icon and a word, never color alone; "no aplica" stays quiet.
 */
export default function GuideStatusBadge({ status }: { status: GuideStatus }) {
  if (status === "not_required") {
    return (
      <span className="text-navy-300" title="No requiere guía (sin factura o anterior a la regla)">
        —
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span
        title="Tiene guía de remisión"
        className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Con guía
      </span>
    );
  }
  return (
    <span
      title="Esta factura aún no tiene su guía de remisión"
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 8v5m0 3.5v.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      Falta guía
    </span>
  );
}
