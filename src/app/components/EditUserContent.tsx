"use client";

import { Permissions } from "@/types/propertyState";
import { supabase } from "@/lib/supabase";
import FieldsSection from "./FieldsSection";
import { useEffect } from "react";
import useSWR from "swr";
import { UUIDTypes } from "uuid";
import useCheckPermission from "@/hooks/useCheckPermission";
import { adminRolesKey } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import ResidentItem from "./ResidentItem";
import toast from "react-hot-toast";
import Image from "next/image";

async function fetcher(userId: string) {
  const { data, error } = await supabase
    .from("user")
    .select("*, role(name)")
    .eq("id", userId)
    .single();
  if (error) throw error;
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
  const { data, error } = await supabase
    .from("user")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
};

const templatesFetcher = async (userId: UUIDTypes) => {
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

  const {
    hasPermission: canHaveResident,
    isLoading: isLoadingCanHaveResident,
  } = useCheckPermission(user?.role_id, Permissions.CAN_HAVE_RESIDENT);

  const {
    hasPermission: canAssignResident,
    isLoading: isLoadingCanAssignResident,
  } = useCheckPermission(currentUserRoleId, Permissions.ASSIGN_RESIDENT);

  const { data: users, isLoading: isLoadingUsers } = useSWR(
    "admin-users",
    usersFetcher
  );

  const { data: roles, isLoading: isLoadingRoles } = useSWR(
    adminRolesKey,
    rolesFetcher
  );

  const { data: templates, isLoading: isLoadingTemplates } = useSWR(
    "admin-templates-as-locations",
    () => templatesFetcher(currentUserId)
  );

  const updateUser = async (fieldName: string, value: string) => {
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

  if (
    isLoadingUsers ||
    isLoadingRoles ||
    isLoadingTemplates ||
    isLoadingCanHaveResident ||
    isLoadingCanAssignResident
  )
    return "loading ...";

  if (!user) return null;

  return (
    <>
      <h2 className="flex gap-2 items-center mb-6 font-semibold text-lg">
        <Image
          src={user.image_url}
          width={50}
          height={50}
          alt={user.first_name}
          className="rounded-full"
        />
        <span>
          {user.first_name} {user.last_name}
          <span className="text-sm block text-gray-500 font-normal">
            {user.role.name}
          </span>
        </span>
      </h2>

      <fieldset className="flex flex-col gap-4">
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
                  defaultValue={user.template_id}
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
        {canHaveResident ? (
          <FieldsSection>
            <h2 className="font-semibold">Residents</h2>
            <div className="flex gap-1 items-center">
              {users?.map((user) => {
                return (
                  <ResidentItem
                    isEditable={canAssignResident}
                    key={user.id}
                    user={user}
                  />
                );
              })}
            </div>
          </FieldsSection>
        ) : null}
        <FieldsSection>
          <h2 className="font-semibold">General Information</h2>
          <div>
            <label htmlFor="first_name" className="inline-block mb-2 text-sm">
              First name
            </label>
            <input
              defaultValue={user.first_name}
              type="text"
              id="first_name"
              required
              disabled
              className="disabled:bg-gray-50 disabled:text-gray-500 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="inline-block mb-2 text-sm">
              Last name
            </label>
            <input
              defaultValue={user.last_name}
              type="text"
              id="name"
              required
              disabled
              className="disabled:bg-gray-50 disabled:text-gray-500 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="username" className="inline-block mb-2 text-sm">
              Username
            </label>
            <input
              defaultValue={user.username}
              disabled
              type="text"
              id="username"
              required
              className="disabled:bg-gray-50 disabled:text-gray-500 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
            />
          </div>
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
