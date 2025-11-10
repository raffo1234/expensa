"use client";

import Pagination from "@/components/Pagination";
import { adminActiveUsersKey } from "@/constants";
import useCheckPermission from "@/hooks/useCheckPermission";
import useScrollRestorationLocalStorage from "@/hooks/useScrollRestorationLocalStorage";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import { UserType } from "@/types/userType";
import { useState } from "react";
import useSWR from "swr";
import UsersSelector from "./UsersSelector";

const usersFetcher = async () => {
  const { data } = (await supabase
    .from("user")
    .select("id, first_name, role_id, last_name, email, role(name)")
    .is("archived_at", null)
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
  useScrollRestorationLocalStorage("/admin/dicoms");

  const [activeUserId, setActiveUserId] = useState(userId);

  const { data: users, isLoading: isLoadingUsers } = useSWR(adminActiveUsersKey, usersFetcher);

  const { hasPermission: canOtherViewDicoms, isLoading: isLoadingCanSeeOtherDicoms } =
    useCheckPermission(userRoleId, Permissions.VIEW_OTHER_DICOMS);

  const { hasPermission: canViewDicoms, isLoading: isLoading } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS,
  );

  const { hasPermission: canViewNew, isLoading: isLoadingCanViewNew } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_NEW_REPORTS,
  );

  const { hasPermission: canViewViewed, isLoading: isLoadingCanViewViewed } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_VIEWED_REPORTS,
  );

  const { hasPermission: canViewDraft, isLoading: isLoadingCanViewDraft } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DRAFT_REPORTS,
  );
  const { hasPermission: canViewCompleted, isLoading: isLoadingCanViewCompleted } =
    useCheckPermission(userRoleId, Permissions.VIEW_COMPLETED_REPORTS);

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
        <UsersSelector
          users={users}
          activeUserId={activeUserId}
          onChange={setActiveUserId}
          localStorageKey="activeUserIdSelected"
        />
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
