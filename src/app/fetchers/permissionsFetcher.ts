import { supabase } from "@/lib/supabase";
import { PermissionType } from "@/types/permissionType";

export default async function permissionsFetcher(): Promise<PermissionType[] | null> {
  const { data } = await supabase
    .from("permission")
    .select("*")
    .order("created_at", { ascending: false });

  return data as PermissionType[] | null;
}
