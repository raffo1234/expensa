import { getSettingValueBySlug } from "@/utils/getSettingValueBySlug";
import { useState, useEffect } from "react";

export function useSettingValueBySlug(slug: string): [string | null, boolean] {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSetting = async () => {
      setLoading(true);
      const settingValue = await getSettingValueBySlug(slug);
      setValue(settingValue);
      setLoading(false);
    };

    fetchSetting();
  }, [slug]);

  return [value, loading];
}