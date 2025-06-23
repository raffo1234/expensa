import { supabase } from "@/lib/supabase";

export async function getSettingValueBySlug(slug: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("global_settings")
        .select("value")
        .eq("slug", slug)
        .single();
  
      if (error) {
        console.error(`Error fetching setting with slug "${slug}":`, error);
        return null;
      }
  
      if (data) {
        return data.value;
      } else {
        console.warn(`Setting with slug "${slug}" not found.`);
        return null;
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      return null;
    }
  }