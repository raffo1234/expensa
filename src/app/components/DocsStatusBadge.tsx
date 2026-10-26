import { ATTACHMENT_KIND_LABELS, pendingLabel, type DocsStatus } from "@/lib/expenseDocs";

const WARNING_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0">
    <path d="M12 8v5m0 3.5v.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * An invoice's documents (factura, guía, comprobante). "Pendiente" names what's
 * missing, in the warning color with an icon and words (never color alone);
 * "no aplica" stays quiet.
 */
export default function DocsStatusBadge({ status }: { status: DocsStatus }) {
  if (status.state === "not_required") {
    return (
      <span className="text-navy-300" title="No aplica (sin factura o anterior a la regla)">
        —
      </span>
    );
  }
  if (status.state === "complete") {
    return (
      <span
        title="Tiene todos los documentos requeridos"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
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
        Completo
      </span>
    );
  }
  return (
    <span
      title={`Falta: ${status.missing.map((k) => ATTACHMENT_KIND_LABELS[k]).join(", ")}`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
    >
      {WARNING_ICON}
      {pendingLabel(status.missing)}
    </span>
  );
}
