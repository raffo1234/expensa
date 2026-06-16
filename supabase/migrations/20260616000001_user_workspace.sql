CREATE TABLE IF NOT EXISTS "public"."user_workspace" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_workspace_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_workspace_unique" UNIQUE ("user_id", "workspace_id")
);

ALTER TABLE "public"."user_workspace" OWNER TO "postgres";
