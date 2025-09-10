"use client";

import { useUpsertUserSetting } from "@/hooks/useUpsertUserSetting";
import { Switch } from "antd";
import FieldsSection from "./FieldsSection";

const SETTING_KEY = "is_menu_contrated";

export default function MySettings({ userId }: { userId: string }) {
  const { settingValue, isLoading, upsertSetting } = useUpsertUserSetting(userId, SETTING_KEY);

  const handleSwitchChange = (checked: boolean) => {
    upsertSetting(checked);
  };

  return (
    <FieldsSection>
      <h2 className="font-semibold">Admin Menu Visibility</h2>
      <div className="flex gap-3 items-center">
        <Switch
          loading={isLoading}
          id="menu-contracted-switch"
          disabled={isLoading}
          checked={settingValue}
          onChange={handleSwitchChange}
        />
        <label htmlFor="menu-contracted-switch">Is menu contracted:</label>
      </div>
    </FieldsSection>
  );
}
