import { supabase } from "@/lib/supabase";

export default async function roleFetcher (roleId: string) {
    const { data, error } = await supabase
      .from("role")
      .select("name")
      .eq("id", roleId);
    if (error) throw error;
    return data;
  };