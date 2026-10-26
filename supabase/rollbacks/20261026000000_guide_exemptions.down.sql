-- Rollback of 20261026000000_guide_exemptions.sql.
DELETE FROM "public"."role_permission"
WHERE "permission_id" IN (SELECT "id" FROM "public"."permission" WHERE "slug" = 'EXEMPT_GUIDE');
DELETE FROM "public"."permission" WHERE "slug" = 'EXEMPT_GUIDE';

ALTER TABLE "public"."expense"
  DROP COLUMN IF EXISTS "guide_exempt_at",
  DROP COLUMN IF EXISTS "guide_exempt_by",
  DROP COLUMN IF EXISTS "guide_exempt_note",
  DROP COLUMN IF EXISTS "guide_exempt_reason";

ALTER TABLE "public"."category" DROP COLUMN IF EXISTS "requires_guide";
