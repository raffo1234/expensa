import { supabase } from "@/lib/supabase";
import useSWR, { mutate } from "swr";
import toast from "react-hot-toast";

const SETTINGS_TABLE = "user_setting";

const getLocalKey = (userId: string, settingKey: string) =>
  `user_setting_${userId}_${settingKey}`;

const readLocalCache = (userId: string, settingKey: string): boolean | null => {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(getLocalKey(userId, settingKey));
  if (val === null) return null;
  return val === "true";
};

const writeLocalCache = (userId: string, settingKey: string, value: boolean) => {
  localStorage.setItem(getLocalKey(userId, settingKey), String(value));
};

const fetcher = async ([tableName, userId, settingKey]: [string, string, string]): Promise<boolean | null> => {
  const { data, error } = await supabase
    .from(tableName)
    .select("setting_value")
    .eq("user_id", userId)
    .eq("setting_key", settingKey)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  const value = data?.setting_value === "true";
  writeLocalCache(userId, settingKey, value);
  return value;
};

export const useUpsertUserSetting = (userId: string, settingKey: string, initialValue = false) => {
  const localCached = userId ? readLocalCache(userId, settingKey) : null;

  const { data, error, isLoading } = useSWR<boolean | null>(
    userId ? [SETTINGS_TABLE, userId, settingKey] : null,
    fetcher,
    { fallbackData: localCached }
  );

  const settingValue = data ?? initialValue;

  const upsertSetting = async (newValue: boolean) => {
    if (!userId) {
      toast.error("User ID not available.");
      return;
    }

    writeLocalCache(userId, settingKey, newValue);
    mutate([SETTINGS_TABLE, userId, settingKey], newValue, false);

    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert(
        { user_id: userId, setting_key: settingKey, setting_value: String(newValue) },
        { onConflict: "user_id,setting_key" }
      )
      .select();

    if (error) {
      toast.error("Failed to update setting.");
      console.error("Upsert error:", error);
    }
  };

  return { settingValue, isLoading, error, upsertSetting };
};
