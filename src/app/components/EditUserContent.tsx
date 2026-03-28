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
import { UserType } from "@/types/userType";

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

const selectClassName =
  "w-full pl-4 pr-7 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 bg-white";

export default function EditUserContent({
  userId,
  currentUserId,
  canAssignResident,
  canHaveResident,
  assignableRoleIds,
  initialUsers,
}: {
  userId: string;
  currentUserId: string;
  canAssignResident: boolean;
  canHaveResident: boolean;
  assignableRoleIds: string[];
  initialUsers: UserType[] | null;
}) {
  const {
    data: user,
    mutate: mutateUser,
    isLoading: isLoadingUser,
  } = useSWR(`admin-${userId}`, () => userFetcher(userId));

  const { data: users } = useSWR(adminUsersKey, usersFetcher, {
    fallbackData: initialUsers ?? undefined,
  });

  const { data: roles } = useSWR(adminRolesKey, rolesFetcher);

  const { data: templates } = useSWR(`admin-templates-by-user-${currentUserId}`, () =>
    templatesByUserFetcher(currentUserId),
  );

  const updateUser = async (fieldName: string, value: string | null) => {
    if (value === "") value = null;
    try {
      await supabase
        .from("user")
        .update({ [fieldName]: value })
        .eq("id", userId);
      toast.success("User was updated successfully!");
    } catch (error) {
      console.error(error);
    } finally {
      mutateUser();
    }
  };

  if (isLoadingUser) return <FallbackEditUser />;
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
            className="disabled:bg-gray-50 disabled:text-gray-500 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
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
                value={user.role_id ?? ""}
                onChange={(e) => updateUser("role_id", e.target.value)}
                disabled={!roles}
                className={selectClassName}
              >
                <option value="">{roles ? "Select ..." : "Loading..."}</option>
                {roles?.map(({ id, name }) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
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
                value={(user.template_id as string) ?? ""}
                onChange={(e) => updateUser("template_id", e.target.value)}
                disabled={!templates}
                className={selectClassName}
              >
                <option value="">{templates ? "Select ..." : "Loading..."}</option>
                {templates?.map(({ id, name }) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="absolute top-1/2 -translate-y-1/2 right-1 pr-3 pointer-events-none bg-white">
                <Icon icon="solar:alt-arrow-down-linear" fontSize={16} />
              </div>
            </div>
          </div>
        </div>
      </FieldsSection>

      {users && user.role_id && (
        <ResidentList
          currentUserId={user.id}
          userRoleId={user.role_id}
          users={users}
          canAssignResident={canAssignResident}
          canHaveResident={canHaveResident}
          assignableRoleIds={assignableRoleIds}
        />
      )}
    </fieldset>
  );
}
