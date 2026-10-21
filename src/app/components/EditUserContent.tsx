"use client";

import {
  getUserWorkspaceIds,
  listAllWorkspaces,
  listRoles,
  setUserWorkspace,
  updateUserFields,
} from "@/actions/admin";
import FieldsSection from "./FieldsSection";
import useSWR from "swr";
import { adminRolesKey, INPUT_CLASS, SELECT_CLASS } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";

import EditUserHeader from "./EditUserHeader";

import userFetcher from "@/lib/userFetcher";
import NoAccess from "./NoAccess";
import FallbackEditUser from "./FallbackEditUser";

const rolesFetcher = () => listRoles();

const workspacesFetcher = () => listAllWorkspaces();

const userWorkspacesFetcher = async (userId: string) => new Set(await getUserWorkspaceIds(userId));

export default function EditUserContent({ userId }: { userId: string }) {
  const {
    data: user,
    mutate: mutateUser,
    isLoading: isLoadingUser,
  } = useSWR(`admin-${userId}`, () => userFetcher(userId));

  const { data: roles } = useSWR(adminRolesKey, rolesFetcher);
  const { data: allWorkspaces } = useSWR("admin-workspaces", workspacesFetcher);
  const { data: assignedWorkspaces } = useSWR(`user-workspaces-${userId}`, () =>
    userWorkspacesFetcher(userId),
  );

  const toggleWorkspace = async (workspaceId: string, nowChecked: boolean) => {
    const { error } = await setUserWorkspace(userId, workspaceId, nowChecked);

    if (error) toast.error("No se pudo actualizar el acceso al proyecto.");
  };

  const updateUser = async (fieldName: string, value: string | null) => {
    if (value === "") value = null;
    try {
      const { error } = await updateUserFields(userId, { [fieldName]: value });
      if (error) throw new Error(error);
      toast.success("Usuario actualizado");
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
            className={INPUT_CLASS}
          />
        </div>
      </FieldsSection>

      <FieldsSection>
        <h2 className="font-semibold">Role</h2>
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
                <option value="">{roles ? "Seleccionar…" : "Cargando…"}</option>
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

      <FieldsSection>
        <h2 className="font-semibold">Acceso a proyectos</h2>
        <div key={assignedWorkspaces ? "loaded" : "loading"} className="flex flex-col gap-2">
          {!allWorkspaces && <p className="text-sm text-gray-500">Cargando…</p>}
          {allWorkspaces?.map((ws) => (
            <label key={ws.id} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                defaultChecked={assignedWorkspaces?.has(ws.id) ?? false}
                onChange={(e) => toggleWorkspace(ws.id, e.target.checked)}
                className="w-4 h-4 accent-violet-500 cursor-pointer"
              />
              <span className="text-sm">{ws.name}</span>
            </label>
          ))}
        </div>
      </FieldsSection>
    </fieldset>
  );
}
