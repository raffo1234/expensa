"use client";

import FormSkeleton from "@/components/FormSkeleton";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { Icon } from "@iconify/react";
import { useGlobalState } from "@/lib/globalState";
import { UUIDTypes } from "uuid";
import { adminRolesKey } from "@/constants";
import FieldsSection from "./FieldsSection";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { UserType } from "@/types/userType";
import Image from "next/image";

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

const templatesFetcher = async (userId: UUIDTypes) => {
  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
};

export default function EditUser({
  currentUserId,
  userId,
  users,
  userRoleId,
  mutateUsers,
  currentRoleId,
}: {
  users: UserType[];
  currentUserId: UUIDTypes;
  userId: string;
  userRoleId: string;
  mutateUsers: () => void;
  currentRoleId: string;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();
  const [messageApi, contextHolder] = message.useMessage();
  const [isSaving, setIsSaving] = useState(false);
  console.log("hi", userRoleId);
  const {
    hasPermission: canAssignResident,
    isLoading: isLoadingCanAssignResident,
  } = useCheckPermission(currentRoleId, Permissions.ASSIGN_RESIDENT);

  const { data: roles, error, isLoading } = useSWR(adminRolesKey, rolesFetcher);
  const {
    data: templates,
    error: errorTemplates,
    isLoading: isLoadingTemplates,
  } = useSWR("admin-templates-as-locations", () =>
    templatesFetcher(currentUserId)
  );

  const residents = users.filter(
    (user) => user.role_id === "33d19e51-de3c-43a0-baa3-e921b45d6567"
  );

  const { data: user } = useSWR(userId, () => fetcher(userId));

  const success = () => {
    messageApi.open({
      type: "success",
      content: "User updated successfully!",
    });
  };

  const { reset, register, handleSubmit } = useForm<Inputs>({
    mode: "onBlur",
    defaultValues: useMemo(() => {
      return user;
    }, [user]),
  });

  const hideModal = () => {
    setModalOpen(false);
  };

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
      if (updatedUser) success();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
      hideModal();
      mutateUsers();
    }
  };

  const showGlobalModal = () => {
    setModalContent(
      <>
        {isLoading || isLoadingTemplates ? (
          <FormSkeleton rows={2} />
        ) : (
          <>
            <h2 className="mb-6 font-semibold text-lg block">Edit User</h2>
            <form onSubmit={handleSubmit(onSubmit)} id="editUser">
              <fieldset className="flex flex-col gap-4">
                <FieldsSection>
                  <h2 className="font-semibold">Role and Location</h2>
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-grow">
                      <label
                        htmlFor="role_id"
                        className="inline-block mb-2 text-sm"
                      >
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
                          <Icon
                            icon="solar:alt-arrow-down-linear"
                            fontSize={16}
                          />
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
                          <Icon
                            icon="solar:alt-arrow-down-linear"
                            fontSize={16}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </FieldsSection>
                {canAssignResident || !isLoadingCanAssignResident ? (
                  <FieldsSection>
                    <h2 className="font-semibold">Residents</h2>
                    <div className="flex gap-1 items-center">
                      {residents.map(
                        ({ image_url, id, first_name, last_name }) => (
                          <Image
                            key={id}
                            src={image_url}
                            width={48}
                            height={48}
                            className={`${true ? "border-cyan-200" : "border-transparent"} border-3 rounded-full`}
                            alt={`${first_name} ${last_name}`}
                          />
                        )
                      )}
                    </div>
                  </FieldsSection>
                ) : null}
                <FieldsSection>
                  <h2 className="font-semibold">General Information</h2>
                  <div>
                    <label
                      htmlFor="first_name"
                      className="inline-block mb-2 text-sm"
                    >
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
                    <label
                      htmlFor="last_name"
                      className="inline-block mb-2 text-sm"
                    >
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
                    <label
                      htmlFor="username"
                      className="inline-block mb-2 text-sm"
                    >
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
                    <label
                      htmlFor="email"
                      className="inline-block mb-2 text-sm"
                    >
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
                  onClick={() => setModalOpen(false)}
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
        )}
      </>
    );
    setModalOpen(true);
  };

  useEffect(() => {
    reset(user);
  }, [user]);

  if (error || errorTemplates) return <div>Error loading item details</div>;

  return (
    <>
      <button
        type="button"
        disabled={isLoading}
        onClick={showGlobalModal}
        className="rounded-full w-11 h-11 border-gray-100 hover:border-gray-200 transition-colors duration-500 border flex items-center justify-center"
      >
        <Icon icon="solar:clapperboard-edit-broken" fontSize={24} />
      </button>
      {contextHolder}
    </>
  );
}
