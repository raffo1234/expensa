"use client";

import { supabase } from "@/lib/supabase";
import FieldsSection from "./FieldsSection";
import useSWR from "swr";
import { UUIDTypes } from "uuid";
import { adminRolesKey, adminUsersKey } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";
import ResidentList from "./ResidentList";
import { UserType } from "@/types/userType";
import EditUserHeader from "./EditUserHeader";
import Link from "next/link";

async function fetcher(userId: string) {
  const { data } = (await supabase
    .from("user")
    .select(
      `
      *,
      role (
        id,
        name
      ),
      template: user_template_id_fkey (
        id,
        name
      ),
      residents: user (
        id,
        first_name
      )
    `
    )
    .eq("id", userId)
    .single()) as { data: UserType | null };
  return data;
}

const rolesFetcher = async () => {
  const { data, error } = await supabase
    .from("role")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
};

const usersFetcher = async () => {
  const { data } = (await supabase
    .from("user")
    .select("*")
    .order("first_name", { ascending: true })) as { data: UserType[] | null };
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
  const { data: user, mutate: mutateUser } = useSWR(`admin-${userId}`, () =>
    fetcher(userId)
  );
  
  const { data: users, isLoading: isLoadingUsers } = useSWR(
    adminUsersKey,
    usersFetcher
  );

  const { data: roles, isLoading: isLoadingRoles } = useSWR(
    adminRolesKey,
    rolesFetcher
  );

  const { data: templates, isLoading: isLoadingTemplates } = useSWR(
    `admin-templates-by-user-${currentUserId}`,
    () => templatesByUserFetcher(currentUserId)
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

  if (isLoadingUsers || isLoadingRoles || isLoadingTemplates)
    return "loading ...";

  if (!user) return null;

  return (
    <>
      <div className="mb-3 flex justify-between items-center -mt-3">
        <h1 className="text-lg font-semibold">User</h1>
        <Link
          href="/admin/users"
          title="Users"
          className="p-2 hover:text-cyan-400 transition-colors duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                d="M11.142 20c-2.227 0-3.341 0-4.27-.501c-.93-.502-1.52-1.42-2.701-3.259l-.681-1.06C2.497 13.634 2 12.86 2 12s.497-1.634 1.49-3.18l.68-1.06c1.181-1.838 1.771-2.757 2.701-3.259S8.915 4 11.142 4h2.637c3.875 0 5.813 0 7.017 1.172S22 8.229 22 12s0 5.657-1.204 6.828S17.654 20 13.78 20z"
                opacity="0.5"
              />
              <path strokeLinecap="round" d="m15.5 9.5l-5 5m0-5l5 5" />
            </g>
          </svg>
        </Link>
      </div>
      <fieldset className="flex flex-col gap-4">
        <FieldsSection>
          <EditUserHeader user={user} />
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
                  onChange={(event) =>
                    updateUser("role_id", event.target.value)
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
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
              <label
                htmlFor="template_id"
                className="inline-block mb-2 text-sm"
              >
                Locations
              </label>
              <div className="relative">
                <select
                  id="template_id"
                  onChange={(event) =>
                    updateUser("template_id", event.target.value)
                  }
                  defaultValue={user.template_id as string}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
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
      </fieldset>
    </>
  );
}
