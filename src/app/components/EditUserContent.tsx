"use client";

import { supabase } from "@/lib/supabase";
import FieldsSection from "./FieldsSection";
import useSWR from "swr";
import { UUIDTypes } from "uuid";
import { adminRolesKey, SELECT_CLASS } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";

import EditUserHeader from "./EditUserHeader";

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

export default function EditUserContent({
  userId,
  currentUserId,
}: {
  userId: string;
  currentUserId: string;
}) {
  const {
    data: user,
    mutate: mutateUser,
    isLoading: isLoadingUser,
  } = useSWR(`admin-${userId}`, () => userFetcher(userId));

  const { data: roles } = useSWR(adminRolesKey, rolesFetcher);

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
                className={SELECT_CLASS}
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
        </div>
      </FieldsSection>
    </fieldset>
  );
}
