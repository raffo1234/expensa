ALTER TABLE "public"."category"
  ADD COLUMN IF NOT EXISTS "parent_id" "uuid" REFERENCES "public"."category"("id") ON DELETE SET NULL;

UPDATE "public"."category" AS child
SET "parent_id" = parent."id"
FROM "public"."category" AS parent
WHERE parent."workspace_id" = '85cea687-7acd-46cc-bb53-b5922dac7ea4'
  AND parent."name" = 'Materiales de contruccion'
  AND child."workspace_id" = parent."workspace_id"
  AND child."name" IN (
    'Acabados',
    'Accesorio de construccion',
    'Concreto premezclado',
    'Fierros',
    'Ladrillos',
    'Tuberias PVC'
  );
