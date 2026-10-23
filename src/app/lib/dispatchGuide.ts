// Guía de remisión rules, shared by server and client.
//
// From GUIDE_REQUIRED_FROM on, every expense with an invoice (series + number)
// must have at least one attachment of kind "guia_remision". The date is the
// invoice's issue date, or the payment date when there's no issue date, so
// invoices issued before the rule started aren't flagged.

export const GUIDE_REQUIRED_FROM = "2026-10-23";

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
};

/** Does this expense need a guía de remisión? */
export function requiresGuide(e: InvoiceDates): boolean {
  if (!e.invoice_series || !e.invoice_number) return false;
  const date = (e.issued_at || e.paid_at || "").slice(0, 10);
  return date >= GUIDE_REQUIRED_FROM;
}

export type GuideStatus = "ok" | "missing" | "not_required";

export function guideStatus(e: InvoiceDates, guideCount: number): GuideStatus {
  if (!requiresGuide(e)) return "not_required";
  return guideCount > 0 ? "ok" : "missing";
}

/**
 * PostgREST `or` filter for "the guide rule applies by date" (pair it with
 * invoice_series/invoice_number not null).
 */
export const GUIDE_DATE_CLAUSE = `issued_at.gte.${GUIDE_REQUIRED_FROM},and(issued_at.is.null,paid_at.gte.${GUIDE_REQUIRED_FROM})`;

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
