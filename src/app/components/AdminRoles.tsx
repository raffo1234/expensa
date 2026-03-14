"use client";

import { Icon } from "@iconify/react";
import { Switch } from "antd";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import useSWR from "swr";
import DeleteRole from "./DeleteRole";
import { adminRolesKey } from "@/constants";
import toast from "react-hot-toast";
import FallBackRolesList from "./FallBackRolesList";

const permissionsFetcher = async () => {
  const { data, error } = await supabase
    .from("permission")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
};

const rolePermissionFetcher = async (roleId: string, permissionId: string) => {
  const { count, error } = await supabase
    .from("role_permission")
    .select("role_id", { count: "exact" })
    .eq("role_id", roleId)
    .eq("permission_id", permissionId);
  if (error) throw error;
  return count;
};

export function Permission({
  permission,
  roleId,
}: {
  permission: { id: string; name: string };
  roleId: string;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { id, name } = permission;

  const {
    data: count,
    isLoading,
    mutate,
  } = useSWR(`${roleId}-${permission.id}-admin-role-permission`, () =>
    rolePermissionFetcher(roleId, permission.id)
  );

  const onChange = async (checked: boolean) => {
    setIsUpdating(true);
    if (checked) {
      await supabase
        .from("role_permission")
        .insert([{ role_id: roleId, permission_id: id }]);
      await mutate();
      setIsUpdating(false);
      toast.success("Role updated successfully!");
    } else {
      await supabase
        .from("role_permission")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", id);
      await mutate();
      setIsUpdating(false);
      toast.success("Role updated successfully!");
    }
  };

  return (
    <div key={id} className="py-1 flex gap-3 items-center">
      {isLoading ? (
        <div className="w-[44px] h-[22px] rounded-3xl bg-gray-100" />
      ) : (
        <Switch
          loading={isLoading || isUpdating}
          id={id}
          disabled={isLoading || isUpdating}
          defaultChecked={count ? count > 0 : false}
          onChange={onChange}
        />
      )}
      <label htmlFor={id} className="py-2">
        {name}
      </label>
    </div>
  );
}

export function Permissions({ roleId }: { roleId: string }) {
  const {
    data: permissions,
    error,
    isLoading,
  } = useSWR(`${roleId}-admin-permissions`, permissionsFetcher);

  if (error) return null;
  if (isLoading) return <FallBackRolesList />;
  return permissions?.map((permission) => {
    return (
      <Permission key={permission.id} roleId={roleId} permission={permission} />
    );
  });
}

export function RoleItem({
  role,
}: {
  role: { id: string; name: string; description: string };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { id, name, description } = role;

  return (
    <>
      <div className="relative first:rounded-t-xl first:border-0 border-t border-gray-200 hover:bg-gray-50">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          key={id}
          className={`${isOpen ? "bg-gray-50" : ""
            } cursor-pointer w-full flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300 pl-6 pr-20 py-4`}
        >
          <span className="flex gap-3.5 items-center">
            <Icon
              icon="solar:alt-arrow-down-linear"
              fontSize={20}
              className={`${isOpen ? "rotate-180" : ""
                } transition-transform duration-500 flex-shrink-0`}
            />
            <span>{name}</span>{" "}
            {description ? (
              <span className="text-sm text-gray-500">{description}</span>
            ) : null}
          </span>
        </button>
        {role.name === "Super" ||
          role.name === "Secretary" ||
          role.name === "Doctor" ||
          role.name === "Patient" ? null : (
          <DeleteRole roleId={role.id} />
        )}
      </div>
      {isOpen ? (
        <div className="border-t border-gray-200 pl-20 pr-4 py-8">
          <Permissions roleId={role.id} />
        </div>
      ) : null}
    </>
  );
}

const rolesFetcher = async () => {
  const { data, error } = await supabase
    .from("role")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
};

export default function AdminRoles() {
  const { data: roles, error, isLoading } = useSWR(adminRolesKey, rolesFetcher);

  if (error) return null;
  if (isLoading) return <FallBackRolesList />

  return roles?.map((role) => <RoleItem key={role.id} role={role} />)
}
