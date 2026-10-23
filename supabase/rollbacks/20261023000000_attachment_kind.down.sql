-- Rollback of 20261023000000_attachment_kind.sql. Attachments themselves are
-- untouched; only the classification columns and their index are removed.
DROP INDEX IF EXISTS "public"."expense_attachment_expense_kind_idx";
ALTER TABLE "public"."expense_attachment"
  DROP COLUMN IF EXISTS "doc_numero",
  DROP COLUMN IF EXISTS "doc_serie",
  DROP COLUMN IF EXISTS "doc_ruc",
  DROP COLUMN IF EXISTS "kind";
