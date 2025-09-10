import { supabase } from "@/lib/supabase";
import useSWR, { mutate } from "swr";
import toast from "react-hot-toast";

const SETTINGS_TABLE = "user_setting";

const fetcher = async ([tableName, userId, settingKey]: [string, string, string]): Promise<
  boolean | null
> => {
  const { data, error } = await supabase
    .from(tableName)
    .select("setting_value")
    .eq("user_id", userId)
    .eq("setting_key", settingKey)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data?.setting_value === "true";
};

export const useUpsertUserSetting = (userId: string, settingKey: string, initialValue = false) => {
  const { data, error, isLoading } = useSWR<boolean | null>(
    userId ? [SETTINGS_TABLE, userId, settingKey] : null,
    fetcher,
  );

  const settingValue = data ?? initialValue;

  const upsertSetting = async (newValue: boolean) => {
    if (!userId) {
      toast.error("User ID not available.");
      return;
    }

    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert(
        {
          user_id: userId,
          setting_key: settingKey,
          setting_value: String(newValue),
        },
        { onConflict: "user_id,setting_key" },
      )
      .select();

    if (error) {
      toast.error("Failed to update setting.");
      console.error("Upsert error:", error);
    } else {
      console.warn("Setting updated!");

      mutate([SETTINGS_TABLE, userId, settingKey], newValue, false);
    }
  };

  return { settingValue, isLoading, error, upsertSetting };
};
