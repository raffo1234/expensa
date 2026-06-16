"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import FieldLabel from "./FieldLabel";
import FieldsSection from "./FieldsSection";
import { RoleType } from "@/types/roleType";
import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import { useSettingValueBySlug } from "@/hooks/useSettingValueBySlug";
import NoAccess from "./NoAccess";
import SettingsPageFallBack from "./SettingsPageFallBack";

export default function SettingsContent({
  roles,
  userRoleId,
}: {
  userRoleId: string;
  roles: RoleType[] | null;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const [defaultSignupRole, loading] = useSettingValueBySlug("default_signup_role");

  const { hasPermission: canViewSettings, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.HANDLE_SETTINGS,
  );

  const updateDefaultSignupRole = async (value: string) => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("global_settings")
        .update({ value })
        .eq("slug", "default_signup_role");

      if (error) {
        console.error("Error updating email signup setting:", error);
        toast.error("Failed to update settings.");
      } else {
        toast.success("Settings updated successfully!");
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };
  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateDefaultSignupRole(event.target.value);
  };

  if (isLoading || loading) return <SettingsPageFallBack />;
  if (!canViewSettings) return <NoAccess />;

  return (
    <FieldsSection>
      <h2 className="font-semibold">Default Role on Sign Up</h2>
      <div className="grow-1 relative">
        <FieldLabel htmlFor="name">Roles</FieldLabel>
        <div className="relative">
          <select
            disabled={isSaving}
            defaultValue={defaultSignupRole ?? ""}
            onChange={onChange}
            className="w-full disable:opacity-50 transition-colors duration-300 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
          >
            {roles?.map(({ id, name }) => {
              return (
                <option value={id} key={id}>
                  {name}
                </option>
              );
            })}
          </select>
          <div className="absolute top-1/2 -translate-y-1/2 right-1 pr-3 pointer-events-none bg-white">
            <Icon icon="solar:alt-arrow-down-linear" fontSize={16} />
          </div>
        </div>
      </div>
    </FieldsSection>
  );
}
