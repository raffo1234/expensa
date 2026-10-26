// Reads an uploaded attachment to tell what it is (factura / guía de remisión).
// Runs on the server only: it reads straight from storage.
import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getDocumentProxy } from "unpdf";
import { r2, BUCKET } from "@/lib/r2";
import { classifyDocumentText, parseGuideFileName } from "@/lib/expenseDocs";

// Uploaded files are untrusted: cap how much we read and how long we try.
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const TIMEOUT_MS = 5000;

export type AttachmentClassification = {
  kind: "factura" | "guia_remision";
  doc_ruc: string | null;
  doc_serie: string | null;
  doc_numero: string | null;
};

/** Text of the first page of a PDF (the header is all we need). */
async function firstPageText(bytes: Uint8Array): Promise<string> {
  // Text only: no font loading. (The bundled pdf.js no longer evaluates code
  // from fonts, the old CVE-2024-4367 path, so there's no eval switch to turn off.)
  const pdf = await getDocumentProxy(bytes, { disableFontFace: true, useSystemFonts: false });
  try {
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    return content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
  } finally {
    await pdf.cleanup();
  }
}

async function classifyPdf(key: string): Promise<AttachmentClassification | null> {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if ((res.ContentLength ?? 0) > MAX_PDF_BYTES) return null;
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) return null;

  const found = classifyDocumentText(await firstPageText(bytes));
  return found
    ? { kind: found.kind, doc_ruc: found.ruc, doc_serie: found.serie, doc_numero: found.numero }
    : null;
}

/**
 * What an uploaded file is. Electronic PDFs are read by their header title
 * ("GUÍA DE REMISIÓN" / "FACTURA ELECTRÓNICA"); otherwise a SUNAT-style name
 * (RUC-09-SERIE-NUMERO) marks a guide. null = unknown (stays "otro"; photos
 * are classified by hand). Never throws: classifying must not break an upload.
 */
export async function classifyAttachment(
  key: string,
  fileName: string,
): Promise<AttachmentClassification | null> {
  if (key.toLowerCase().endsWith(".pdf")) {
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
      const byContent = await Promise.race([classifyPdf(key), timeout]);
      if (byContent) return byContent;
    } catch {
      // Unreadable or malformed PDF: fall back to the file name.
    }
  }

  const byName = parseGuideFileName(fileName);
  return byName
    ? {
        kind: "guia_remision",
        doc_ruc: byName.ruc,
        doc_serie: byName.serie,
        doc_numero: byName.numero,
      }
    : null;
}
