// Expense documents rules, shared by server and client.
//
// From DOCS_REQUIRED_FROM on, every expense with an invoice (series + number)
// must have its factura, guía de remisión and comprobante de pago attached
// (attachment `kind`). The date is the invoice's issue date, or the payment
// date when there's no issue date, so older invoices aren't flagged.

export const DOCS_REQUIRED_FROM = "2026-10-23";

export const ATTACHMENT_KINDS = ["factura", "guia_remision", "comprobante_pago", "otro"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  factura: "Factura",
  guia_remision: "Guía de remisión",
  comprobante_pago: "Comprobante de pago",
  otro: "Otro",
};

export const isAttachmentKind = (v: unknown): v is AttachmentKind =>
  typeof v === "string" && (ATTACHMENT_KINDS as readonly string[]).includes(v);

/**
 * SUNAT names electronic guides RUC-TIPO-SERIE-NUMERO, e.g.
 * 20360062857-09-EG07-5352.pdf (09 = remitente, 31 = transportista).
 */
export function parseGuideFileName(
  name: string | null | undefined,
): { ruc: string; serie: string; numero: string } | null {
  const m = name?.match(/^(\d{11})-(?:09|31)-([A-Za-z0-9]{4})-(\d+)/);
  return m ? { ruc: m[1], serie: m[2].toUpperCase(), numero: m[3] } : null;
}

type InvoiceDates = {
  invoice_series?: string | null;
  invoice_number?: string | null;
  issued_at?: string | null;
  paid_at?: string | null;
  /** The category's rule; missing = requires a guide (the safe default). */
  category?: { requires_guide?: boolean | null } | null;
  /** Set when an admin marked this expense as not needing a guide. */
  guide_exempt_reason?: string | null;
};

/** Reasons an expense may go without a guía de remisión. */
export const GUIDE_EXEMPT_REASONS = ["servicio", "pasaje", "recojo_tienda", "otro"] as const;
export type GuideExemptReason = (typeof GUIDE_EXEMPT_REASONS)[number];
export const GUIDE_EXEMPT_REASON_LABELS: Record<GuideExemptReason, string> = {
  servicio: "Servicio",
  pasaje: "Pasaje",
  recojo_tienda: "Recojo en tienda",
  otro: "Otro",
};
export const isGuideExemptReason = (v: unknown): v is GuideExemptReason =>
  typeof v === "string" && (GUIDE_EXEMPT_REASONS as readonly string[]).includes(v);

/**
 * Does this expense need a guía de remisión? Not when its category doesn't
 * (pasajes, servicios...) or when it was exempted by hand.
 */
export function guideApplies(e: InvoiceDates): boolean {
  return e.category?.requires_guide !== false && !e.guide_exempt_reason;
}

/**
 * Documents every invoice must have attached, typed by `kind`: the invoice
 * itself, its guía de remisión and the proof of payment.
 */
export const REQUIRED_DOCS = ["factura", "guia_remision", "comprobante_pago"] as const;
export type RequiredDoc = (typeof REQUIRED_DOCS)[number];

/** Short names for "… pendiente" in tables. */
export const REQUIRED_DOC_SHORT: Record<RequiredDoc, string> = {
  factura: "Factura",
  guia_remision: "Guía",
  comprobante_pago: "Comprobante",
};

/** Does the documents rule apply? An invoice issued (or paid) from DOCS_REQUIRED_FROM on. */
export function requiresDocs(e: InvoiceDates): boolean {
  if (!e.invoice_series || !e.invoice_number) return false;
  const date = (e.issued_at || e.paid_at || "").slice(0, 10);
  return date >= DOCS_REQUIRED_FROM;
}

export type DocsStatus =
  | { state: "complete"; missing: [] }
  | { state: "pending"; missing: RequiredDoc[] }
  | { state: "not_required"; missing: [] };

/**
 * From the kinds of the expense's attachments (the guide counts only when it
 * applies, see guideApplies):
 * - all required documents attached → "complete" (whatever the date);
 * - something missing and the rule applies → "pending", listing what's missing;
 * - otherwise → "not_required".
 */
export function docsStatus(e: InvoiceDates, kinds: Iterable<string>): DocsStatus {
  const have = new Set(kinds);
  const required = guideApplies(e)
    ? REQUIRED_DOCS
    : REQUIRED_DOCS.filter((k) => k !== "guia_remision");
  const missing = required.filter((k) => !have.has(k));
  if (!missing.length) return { state: "complete", missing: [] };
  if (!requiresDocs(e)) return { state: "not_required", missing: [] };
  return { state: "pending", missing };
}

/** "Guía pendiente", or "2 documentos pendientes". */
export function pendingLabel(missing: RequiredDoc[]): string {
  return missing.length === 1
    ? `${REQUIRED_DOC_SHORT[missing[0]]} pendiente`
    : `${missing.length} documentos pendientes`;
}

/**
 * PostgREST `or` filter for "the rule applies by date" (pair it with
 * invoice_series/invoice_number not null).
 */
export const DOCS_DATE_CLAUSE = `issued_at.gte.${DOCS_REQUIRED_FROM},and(issued_at.is.null,paid_at.gte.${DOCS_REQUIRED_FROM})`;

export type ClassifiedDocument = {
  kind: "factura" | "guia_remision";
  ruc: string | null;
  serie: string | null;
  numero: string | null;
};

/**
 * Classifies a document from its text by the title in its header: SUNAT
 * documents read "GUÍA DE REMISIÓN ELECTRÓNICA" or "FACTURA ELECTRÓNICA".
 * The title that appears FIRST wins: an invoice often mentions its guide in
 * the body ("Guía de remisión: EG07-5352") and a guide may mention its invoice.
 */
export function classifyDocumentText(raw: string): ClassifiedDocument | null {
  // Uppercase, no accents, single spaces: "GUÍA  DE REMISIÓN" → "GUIA DE REMISION".
  const text = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ");

  const titles = [
    { kind: "guia_remision" as const, at: text.search(/GUIA DE REMISION/) },
    { kind: "factura" as const, at: text.search(/FACTURA ELECTRONICA/) },
  ].filter((t) => t.at >= 0);
  if (!titles.length) return null;
  const title = titles.reduce((a, b) => (b.at < a.at ? b : a));

  // Issuer RUC: "RUC: 20601315123", "RUC N°20360062857".
  const ruc = text.match(/R\.?\s?U\.?\s?C\.?\s*(?:N\s?[°º.O]?\s*)?:?\s*(\d{11})/)?.[1] ?? null;
  // Series and number right after the title: "E001-429", "N° EG07 - 00005352".
  const ref = text.slice(title.at).match(/\b([A-Z][A-Z0-9]{3})\s*-\s*(\d{1,8})\b/);

  return {
    kind: title.kind,
    ruc,
    serie: ref?.[1] ?? null,
    numero: ref ? String(Number(ref[2])) : null,
  };
}
