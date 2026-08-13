CREATE TABLE IF NOT EXISTS "public"."material" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "material_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "material_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id"),
    CONSTRAINT "material_workspace_id_name_key" UNIQUE ("workspace_id", "name")
);

ALTER TABLE "public"."material" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."brand" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "brand_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brand_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id"),
    CONSTRAINT "brand_workspace_id_name_key" UNIQUE ("workspace_id", "name")
);

ALTER TABLE "public"."brand" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."unit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "unit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "unit_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id"),
    CONSTRAINT "unit_workspace_id_name_key" UNIQUE ("workspace_id", "name")
);

ALTER TABLE "public"."unit" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."expense_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "brand_id" "uuid",
    "unit_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_price" integer,
    "subtotal" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "expense_item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expense_item_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expense"("id") ON DELETE CASCADE,
    CONSTRAINT "expense_item_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id"),
    CONSTRAINT "expense_item_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id"),
    CONSTRAINT "expense_item_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id")
);

ALTER TABLE "public"."expense_item" OWNER TO "postgres";
