import { getGlobalSetting } from "@/actions/admin";

export async function getSettingValueBySlug(slug: string): Promise<string | null> {
  try {
    return await getGlobalSetting(slug);
  } catch (error) {
    console.error(`Error fetching setting with slug "${slug}":`, error);
    return null;
  }
}
