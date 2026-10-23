-- What each expense attachment is, so the app can tell which invoices still
-- lack their guía de remisión (required for every invoice from 2026-10-23).
--   factura           the invoice itself
--   guia_remision     SUNAT dispatch guide (remitente 09 / transportista 31)
--   comprobante_pago  proof of payment (transfer, Yape...)
--   otro              anything else (default)
-- doc_* hold the guide's issuer RUC, series and number when known.
ALTER TABLE "public"."expense_attachment"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'otro'
    CHECK ("kind" IN ('factura', 'guia_remision', 'comprobante_pago', 'otro')),
  ADD COLUMN IF NOT EXISTS "doc_ruc" text,
  ADD COLUMN IF NOT EXISTS "doc_serie" text,
  ADD COLUMN IF NOT EXISTS "doc_numero" text;

-- "Does this expense have a guide?" is asked per expense on every list page.
CREATE INDEX IF NOT EXISTS "expense_attachment_expense_kind_idx"
  ON "public"."expense_attachment" ("expense_id", "kind");

-- Backfill: files already named the SUNAT way (RUC-09-SERIE-NUMERO, e.g.
-- 20360062857-09-EG07-5352.pdf) are guides; their parts fill doc_*.
UPDATE "public"."expense_attachment"
SET
  "kind" = 'guia_remision',
  "doc_ruc" = substring("file_name" from '^([0-9]{11})-'),
  "doc_serie" = upper(substring("file_name" from '^[0-9]{11}-(?:09|31)-([A-Za-z0-9]{4})-')),
  "doc_numero" = substring("file_name" from '^[0-9]{11}-(?:09|31)-[A-Za-z0-9]{4}-([0-9]+)')
WHERE "kind" = 'otro'
  AND "file_name" ~ '^[0-9]{11}-(09|31)-[A-Za-z0-9]{4}-[0-9]+';
