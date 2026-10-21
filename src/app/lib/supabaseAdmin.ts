// Uses the service role key, which bypasses all database access rules. It must
// never reach the browser: "server-only" makes the build fail if it would.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
