import { getMySetting, setMySetting } from "@/actions/admin";
import useSWR, { mutate } from "swr";
import toast from "react-hot-toast";

const SETTINGS_TABLE = "user_setting";

const getLocalKey = (userId: string, settingKey: string) => `user_setting_${userId}_${settingKey}`;

const readLocalCache = (userId: string, settingKey: string): boolean | null => {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(getLocalKey(userId, settingKey));
  if (val === null) return null;
  return val === "true";
};

const writeLocalCache = (userId: string, settingKey: string, value: boolean) => {
  localStorage.setItem(getLocalKey(userId, settingKey), String(value));
};

// The server reads and writes the signed-in user's own settings; the userId
// argument only scopes the local cache and the SWR key.
const fetcher = async ([, userId, settingKey]: [string, string, string]): Promise<
  boolean | null
> => {
  const value = (await getMySetting(settingKey)) ?? false;
  writeLocalCache(userId, settingKey, value);
  return value;
};

export const useUpsertUserSetting = (userId: string, settingKey: string, initialValue = false) => {
  const localCached = userId ? readLocalCache(userId, settingKey) : null;

  const { data, error, isLoading } = useSWR<boolean | null>(
    userId ? [SETTINGS_TABLE, userId, settingKey] : null,
    fetcher,
    { fallbackData: localCached },
  );

  const settingValue = data ?? initialValue;

  const upsertSetting = async (newValue: boolean) => {
    if (!userId) {
      toast.error("User ID not available.");
      return;
    }

    writeLocalCache(userId, settingKey, newValue);
    mutate([SETTINGS_TABLE, userId, settingKey], newValue, false);

    const { error } = await setMySetting(settingKey, newValue);

    if (error) {
      toast.error("Failed to update setting.");
      console.error("Upsert error:", error);
    }
  };

  return { settingValue, isLoading, error, upsertSetting };
};
