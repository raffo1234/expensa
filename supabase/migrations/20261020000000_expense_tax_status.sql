-- Tax situation of each expense, so material prices from purchases with and
-- without IGV are never compared as if they were the same.
--   con_igv          invoice/receipt that charges IGV
--   sin_igv          formal receipt without IGV (exonerada, inafecta, Nuevo RUS)
--   sin_comprobante  informal purchase, no tax document
ALTER TABLE "public"."expense"
  ADD COLUMN IF NOT EXISTS "tax_status" text
  CHECK ("tax_status" IN ('con_igv', 'sin_igv', 'sin_comprobante'));

-- Best-effort backfill: expenses with an invoice reference are assumed to carry
-- IGV; the rest are treated as purchases without a tax document. Exempt invoices
-- registered before this change must be corrected by hand from the edit page.
UPDATE "public"."expense"
SET "tax_status" = CASE
  WHEN "invoice_series" IS NOT NULL AND "invoice_number" IS NOT NULL THEN 'con_igv'
  ELSE 'sin_comprobante'
END
WHERE "tax_status" IS NULL;
