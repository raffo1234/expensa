import { supabase } from "@/lib/supabase";
import { unstable_cache } from "next/cache";

async function permissionFetcherServer(slug: string) {
  const { data, error } = await supabase
    .from("permission")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) {
    console.error(`Error fetching permission ${slug} on server:`, error);
    return null;
  }
  return data;
}

// This function is designed to be used in Server Components
export const prefetchPermissionServer = unstable_cache(
  async (slug: string) => {
    const permissionData = await permissionFetcherServer(slug);
    return {
      [`permission-${slug}`]: permissionData ? permissionData : null, // Handle potential null response
    };
  },
  ["permissions"],
  {
    revalidate: 3600,
  }
);

export async function fetchAllPermissionsServer(): Promise<string[]> {
  const { data, error } = await supabase.from("permission").select("slug");
  if (error) {
    console.error("Error fetching all permission slugs on server:", error);
    return [];
  }
  return data ? data.map((p) => p.slug) : [];
}
