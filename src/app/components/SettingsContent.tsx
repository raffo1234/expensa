"use client";

import { SELECT_CLASS } from "@/constants";
import FieldLabel from "./FieldLabel";
import FieldsSection from "./FieldsSection";
import { RoleType } from "@/types/roleType";
import { useState } from "react";
import toast from "react-hot-toast";
import { updateGlobalSetting } from "@/actions/admin";
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
      const { error } = await updateGlobalSetting("default_signup_role", value);

      if (error) {
        console.error("Error updating email signup setting:", error);
        toast.error("No se pudo guardar la configuración.");
      } else {
        toast.success("Configuración guardada");
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
      <h2 className="font-book text-navy-900">Default Role on Sign Up</h2>
      <div className="grow-1 relative">
        <FieldLabel htmlFor="name">Roles</FieldLabel>
        <div className="relative">
          <select
            disabled={isSaving}
            defaultValue={defaultSignupRole ?? ""}
            onChange={onChange}
            className={SELECT_CLASS}
          >
            {roles?.map(({ id, name }) => {
              return (
                <option value={id} key={id}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </FieldsSection>
  );
}
