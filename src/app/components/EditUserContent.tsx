"use client";

import { supabase } from "@/lib/supabase";
import FieldsSection from "./FieldsSection";
import useSWR from "swr";
import { UUIDTypes } from "uuid";
import { adminRolesKey, adminUsersKey } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";
import ResidentList from "./ResidentList";
import EditUserHeader from "./EditUserHeader";
import usersFetcher from "@/lib/usersFetcher";
import userFetcher from "@/lib/userFetcher";
import NoAccess from "./NoAccess";
import FallbackEditUser from "./FallbackEditUser";

const rolesFetcher = async () => {
  const { data, error } = await supabase
    .from("role")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
};

const templatesByUserFetcher = async (userId: UUIDTypes) => {
  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
};

export default function EditUserContent({
  userId,
  currentUserId,
  currentUserRoleId,
}: {
  userId: string;
  currentUserId: string;
  currentUserRoleId: string;
}) {
  const { data: user, mutate: mutateUser } = useSWR(`admin-${userId}`, () => userFetcher(userId));

  const { data: users, isLoading: isLoadingUsers } = useSWR(adminUsersKey, usersFetcher);

  const { data: roles, isLoading: isLoadingRoles } = useSWR(adminRolesKey, rolesFetcher);

  const { data: templates, isLoading: isLoadingTemplates } = useSWR(
    `admin-templates-by-user-${currentUserId}`,
    () => templatesByUserFetcher(currentUserId),
  );

  const updateUser = async (fieldName: string, value: string | null) => {
    if (value === "") value = null;

    try {
      await supabase
        .from("user")
        .update({ [fieldName]: value })
        .eq("id", userId);
    } catch (error) {
      console.error(error);
    } finally {
      toast.success("User was updated successfully!");
      mutateUser();
    }
  };

  if (isLoadingUsers || isLoadingRoles || isLoadingTemplates) return <FallbackEditUser />;

  if (!user) return <NoAccess />;

  return (
    <fieldset className="flex flex-col gap-4">
      <FieldsSection>
        <EditUserHeader user={user} />
      </FieldsSection>
      <FieldsSection>
        <h2 className="font-semibold">General Information</h2>
        <div>
          <label htmlFor="email" className="inline-block mb-2 text-sm">
            Email
          </label>
          <input
            defaultValue={user.email}
            disabled
            type="email"
            id="email"
            required
            className="disabled:bg-gray-50 disabled:text-gray-500 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
          />
        </div>
      </FieldsSection>
      <FieldsSection>
        <h2 className="font-semibold">Role and Location</h2>
        <div className="flex items-center gap-4 w-full">
          <div className="flex-grow">
            <label htmlFor="role_id" className="inline-block mb-2 text-sm">
              Role
            </label>
            <div className="relative">
              <select
                id="role_id"
                defaultValue={user.role_id}
                onChange={(event) => updateUser("role_id", event.target.value)}
                className="w-full pl-4 pr-7 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
              >
                <option value="">Select ...</option>
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
          <div className="flex-grow">
            <label htmlFor="template_id" className="inline-block mb-2 text-sm">
              Locations
            </label>
            <div className="relative">
              <select
                id="template_id"
                onChange={(event) => updateUser("template_id", event.target.value)}
                defaultValue={user.template_id as string}
                className="w-full pl-4 pr-7 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
              >
                <option value="">Select ...</option>
                {templates?.map(({ id, name }) => {
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
        </div>
      </FieldsSection>
      {users && user?.role_id ? (
        <ResidentList
          currentUserId={user.id}
          currentUserRoleId={currentUserRoleId}
          userRoleId={user.role_id}
          users={users}
        />
      ) : null}
    </fieldset>
  );
}
