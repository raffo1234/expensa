

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."dicom" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dicom_url" character varying,
    "user_id" "uuid",
    "patient_name" character varying,
    "patient_id" character varying,
    "study_description" character varying,
    "modality" character varying,
    "study_date" character varying,
    "patient_age" character varying,
    "template_id" "uuid",
    "report" character varying,
    "state" character varying DEFAULT ''::character varying,
    "gender" character varying,
    "birthday" character varying,
    "institution" character varying,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."dicom" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pac" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip" character varying NOT NULL,
    "port" character varying NOT NULL,
    "aet_server" character varying NOT NULL,
    "aet_client" character varying,
    "description" character varying,
    "user_id" "uuid",
    "is_verified" boolean,
    "institution_name" character varying
);


ALTER TABLE "public"."pac" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying,
    "description" character varying,
    "slug" character varying
);


ALTER TABLE "public"."permission" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying,
    "description" character varying
);


ALTER TABLE "public"."role" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permission" (
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "permission_id" "uuid"
);


ALTER TABLE "public"."role_permission" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying,
    "description" character varying,
    "header_image_url" character varying,
    "sign_image_url" character varying,
    "footer_image_url" character varying,
    "user_id" "uuid"
);


ALTER TABLE "public"."template" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" character varying NOT NULL,
    "name" character varying,
    "first_name" character varying,
    "last_name" character varying,
    "provider_id" character varying,
    "image_url" character varying,
    "username" character varying,
    "provider" character varying,
    "role_id" "uuid",
    "template_id" "uuid",
    "supervisor_user_id" "uuid"
);


ALTER TABLE "public"."user" OWNER TO "postgres";


ALTER TABLE ONLY "public"."pac"
    ADD CONSTRAINT "pac_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission"
    ADD CONSTRAINT "permission_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permission"
    ADD CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id", "created_at");



ALTER TABLE ONLY "public"."role"
    ADD CONSTRAINT "role_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template"
    ADD CONSTRAINT "template_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dicom"
    ADD CONSTRAINT "user_dicom_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dicom"
    ADD CONSTRAINT "dicom_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pac"
    ADD CONSTRAINT "pac_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permission"
    ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permission"
    ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template"
    ADD CONSTRAINT "template_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dicom"
    ADD CONSTRAINT "user_dicom_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_supervisor_user_id_fkey" FOREIGN KEY ("supervisor_user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE SET NULL;



ALTER TABLE "public"."dicom" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pac" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pac all" ON "public"."pac" USING (true) WITH CHECK (true);



ALTER TABLE "public"."permission" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission all" ON "public"."permission" USING (true) WITH CHECK (true);



ALTER TABLE "public"."role" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role all" ON "public"."role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."role_permission" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permission all" ON "public"."role_permission" USING (true) WITH CHECK (true);



ALTER TABLE "public"."template" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_all" ON "public"."template" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user all" ON "public"."user" USING (true) WITH CHECK (true);



CREATE POLICY "user_dicom all" ON "public"."dicom" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON TABLE "public"."dicom" TO "anon";
GRANT ALL ON TABLE "public"."dicom" TO "authenticated";
GRANT ALL ON TABLE "public"."dicom" TO "service_role";



GRANT ALL ON TABLE "public"."pac" TO "anon";
GRANT ALL ON TABLE "public"."pac" TO "authenticated";
GRANT ALL ON TABLE "public"."pac" TO "service_role";



GRANT ALL ON TABLE "public"."permission" TO "anon";
GRANT ALL ON TABLE "public"."permission" TO "authenticated";
GRANT ALL ON TABLE "public"."permission" TO "service_role";



GRANT ALL ON TABLE "public"."role" TO "anon";
GRANT ALL ON TABLE "public"."role" TO "authenticated";
GRANT ALL ON TABLE "public"."role" TO "service_role";



GRANT ALL ON TABLE "public"."role_permission" TO "anon";
GRANT ALL ON TABLE "public"."role_permission" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permission" TO "service_role";



GRANT ALL ON TABLE "public"."template" TO "anon";
GRANT ALL ON TABLE "public"."template" TO "authenticated";
GRANT ALL ON TABLE "public"."template" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
