"use client";

import Pagination from "@/components/Pagination";
import { adminUsersKey } from "@/constants";
import useCheckPermission from "@/hooks/useCheckPermission";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import { UserType } from "@/types/userType";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import useSWR from "swr";

const usersFetcher = async () => {
  const { data } = (await supabase
    .from("user")
    .select("id, first_name, role_id, last_name, email, role(name)")
    .order("first_name", { ascending: true })) as { data: UserType[] | null };

  return data;
};

export default function DicomsTable({
  userId,
  userRoleId,
}: {
  userId: string;
  userRoleId: string;
}) {
  const [activeUserId, setActiveUserId] = useState(userId);

  const { data: users, isLoading: isLoadingUsers } = useSWR(
    adminUsersKey,
    usersFetcher
  );

  const {
    hasPermission: canOtherViewDicoms,
    isLoading: isLoadingCanSeeOtherDicoms,
  } = useCheckPermission(userRoleId, Permissions.VIEW_OTHER_DICOMS);

  const { hasPermission: canViewDicoms, isLoading: isLoading } =
    useCheckPermission(userRoleId, Permissions.VIEW_DICOMS);

  const { hasPermission: canViewNew, isLoading: isLoadingCanViewNew } =
    useCheckPermission(userRoleId, Permissions.VIEW_NEW_REPORTS);

  const { hasPermission: canViewViewed, isLoading: isLoadingCanViewViewed } =
    useCheckPermission(userRoleId, Permissions.VIEW_VIEWED_REPORTS);

  const { hasPermission: canViewDraft, isLoading: isLoadingCanViewDraft } =
    useCheckPermission(userRoleId, Permissions.VIEW_DRAFT_REPORTS);
  const {
    hasPermission: canViewCompleted,
    isLoading: isLoadingCanViewCompleted,
  } = useCheckPermission(userRoleId, Permissions.VIEW_COMPLETED_REPORTS);

  if (
    isLoadingUsers ||
    isLoadingCanSeeOtherDicoms ||
    isLoading ||
    isLoadingCanViewNew ||
    isLoadingCanViewViewed ||
    isLoadingCanViewDraft ||
    isLoadingCanViewCompleted
  )
    return null;

  if (!canViewDicoms) return null;

  return (
    <>
      {canOtherViewDicoms ? (
        <div className="relative max-w-120 mb-6 w-full">
          <select
            defaultValue={activeUserId}
            onChange={(event) => setActiveUserId(event.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
          >
            <option value="">Select ...</option>
            {users?.map(({ id, first_name, role, last_name, email }) => {
              return (
                <option value={id} key={id}>
                  ({role?.name ?? "No role"}) - {first_name} {last_name} (
                  {email})
                </option>
              );
            })}
          </select>
          <div className="absolute top-1/2 -translate-y-1/2 right-1 pr-3 pointer-events-none bg-white">
            <Icon icon="solar:alt-arrow-down-linear" fontSize={16} />
          </div>
        </div>
      ) : null}
      <Pagination
        tableName="dicom"
        userRoleId={userRoleId}
        userId={canOtherViewDicoms ? activeUserId : userId}
        canViewNew={canViewNew}
        canViewViewed={canViewViewed}
        canViewDraft={canViewDraft}
        canViewCompleted={canViewCompleted}
      />
    </>
  );
}
