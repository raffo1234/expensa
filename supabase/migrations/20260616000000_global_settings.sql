CREATE TABLE IF NOT EXISTS "public"."global_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" character varying NOT NULL,
    "value" character varying,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "global_settings_slug_key" UNIQUE ("slug")
);

ALTER TABLE "public"."global_settings" OWNER TO "postgres";

INSERT INTO "public"."global_settings" ("slug", "value")
VALUES ('default_signup_role', NULL)
ON CONFLICT ("slug") DO NOTHING;
