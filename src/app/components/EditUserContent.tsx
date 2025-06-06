"use client";

import { Permissions } from "@/types/propertyState";
import { supabase } from "@/lib/supabase";
import FieldsSection from "./FieldsSection";
import { useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import useSWR from "swr";
import { UUIDTypes } from "uuid";
import useCheckPermission from "@/hooks/useCheckPermission";
import { adminRolesKey } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import ResidentItem from "./ResidentItem";

async function fetcher(userId: string) {
  const { data, error } = await supabase
    .from("user")
    .select()
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

type Inputs = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  template_id: UUIDTypes | null;
};

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
    .select(
      "id, image_url, username, email, role_id, first_name, last_name, role(id, name)"
    )
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
  currentUserId,
  currentUserRoleId,
  userId,
  userRoleId,
}: {
  currentUserId: string;
  currentUserRoleId: string;
  userId: string;
  userRoleId: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    hasPermission: canHaveResident,
    isLoading: isLoadingCanHaveResident,
  } = useCheckPermission(userRoleId, Permissions.CAN_HAVE_RESIDENT);

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

  const { data: user } = useSWR(`admin-${userId}`, () => fetcher(userId));

  const { reset, register, handleSubmit } = useForm<Inputs>({
    mode: "onBlur",
    defaultValues: useMemo(() => {
      return user;
    }, [user]),
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.template_id === "") {
      data.template_id = null;
    }

    setIsSaving(true);

    try {
      const { data: updatedUser } = await supabase
        .from("user")
        .update(data)
        .eq("id", userId)
        .select()
        .single();
      if (updatedUser) console.log("success!!!");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    reset(user);
  }, [user]);

  if (
    isLoadingUsers ||
    isLoadingRoles ||
    isLoadingTemplates ||
    isLoadingCanHaveResident ||
    isLoadingCanAssignResident
  )
    return "loading ...";

  return (
    <>
      <h2 className="mb-6 font-semibold text-lg block">Edit User</h2>
      <form onSubmit={handleSubmit(onSubmit)} id="editUser">
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
                    {...register("role_id")}
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
                    {...register("template_id")}
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
                  return user.role_id ? (
                    <ResidentItem
                      isEditable={canAssignResident}
                      key={user.id}
                      user={user}
                    />
                  ) : null;
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
                {...register("first_name")}
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
                {...register("last_name")}
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
                {...register("username")}
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
                {...register("email")}
                disabled
                type="email"
                id="email"
                required
                className="disabled:bg-gray-50 disabled:text-gray-500 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
              />
            </div>
          </FieldsSection>
        </fieldset>
        <footer className="flex items-center gap-3.5 justify-end mt-6 pt-6">
          <button
            type="button"
            className="font-semibold disabled:border-gray-100 disabled:bg-gray-100 inline-block py-3 px-10 bg-white text-sm border border-gray-100 rounded-lg transition-colors hover:border-gray-200 duration-500 active:border-gray-300"
          >
            Cancel
          </button>
          <button
            disabled={isSaving}
            type="submit"
            className="text-white font-semibold disabled:opacity-80 inline-block py-3 px-10 text-sm bg-cyan-500 hover:bg-cyan-400 transition-colors duration-500 rounded-lg"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </footer>
      </form>
    </>
  );
}
