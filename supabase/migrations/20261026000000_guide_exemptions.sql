-- Not every invoice needs a guía de remisión (it backs a transfer of goods;
-- pasajes, servicios, mano de obra... have none).
--
-- 1. Per category: requires_guide (default true, the safe side: a new
--    category keeps asking for the guide until someone decides otherwise).
ALTER TABLE "public"."category"
  ADD COLUMN IF NOT EXISTS "requires_guide" boolean NOT NULL DEFAULT true;

-- 2. Per expense, for the odd case (e.g. goods picked up at the store): an
--    exemption with a reason, and who set it and when, for the accountant.
ALTER TABLE "public"."expense"
  ADD COLUMN IF NOT EXISTS "guide_exempt_reason" text
    CHECK ("guide_exempt_reason" IN ('servicio', 'pasaje', 'recojo_tienda', 'otro')),
  ADD COLUMN IF NOT EXISTS "guide_exempt_note" text,
  ADD COLUMN IF NOT EXISTS "guide_exempt_by" uuid REFERENCES "public"."user"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "guide_exempt_at" timestamp with time zone;

-- 3. Permission to set those exemptions and change a category's rule.
INSERT INTO "public"."permission" ("name", "description", "slug")
SELECT
  'Exceptuar guía de remisión',
  'Marcar que una categoría o un gasto no requiere guía de remisión',
  'EXEMPT_GUIDE'
WHERE NOT EXISTS (SELECT 1 FROM "public"."permission" WHERE "slug" = 'EXEMPT_GUIDE');

-- Granted to the role of the admin account (rhmcord@gmail.com). Every user
-- with that same role gets it; more roles can be added later from "Roles".
INSERT INTO "public"."role_permission" ("role_id", "permission_id")
SELECT u."role_id", p."id"
FROM "public"."user" u
JOIN "public"."permission" p ON p."slug" = 'EXEMPT_GUIDE'
WHERE u."email" = 'rhmcord@gmail.com'
  AND u."role_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "public"."role_permission" rp
    WHERE rp."role_id" = u."role_id" AND rp."permission_id" = p."id"
  );
