"use client";

import Pagination from "@/components/Pagination";
import { adminActiveUsersKey } from "@/constants";
import useScrollRestorationLocalStorage from "@/hooks/useScrollRestorationLocalStorage";
import { checkPermissions } from "@/lib/checkPermissions";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import { UserType } from "@/types/userType";
import { Suspense, useState } from "react";
import useSWR from "swr";
import UsersSelector from "./UsersSelector";
import NoAccess from "./NoAccess";
import TableSkeleton from "@/components/FormSkeleton";

const REQUIRED_PERMISSIONS = [
  Permissions.VIEW_DICOMS,
  Permissions.VIEW_OTHER_DICOMS,
  Permissions.VIEW_NEW_REPORTS,
  Permissions.VIEW_VIEWED_REPORTS,
  Permissions.VIEW_DRAFT_REPORTS,
  Permissions.VIEW_COMPLETED_REPORTS,
];

const usersFetcher = async () => {
  const { data } = (await supabase
    .from("user")
    .select("id, first_name, image_url, role_id, last_name, email, role(name)")
    .is("archived_at", null)
    .order("first_name", { ascending: true })) as { data: UserType[] | null };
  return data;
};

function Skeleton() {
  return (
    <>
      <div className="animate-pulse max-w-[480px] h-16 w-full rounded-xl bg-gray-100 mb-6"></div>
      <div className="flex gap-2 mb-4">
        <div className="animate-pulse h-[38px] bg-gray-100 flex-grow-1 rounded-full"></div>
        <div className="animate-pulse h-[38px] bg-gray-100 flex-grow-1 rounded-full"></div>
        <div className="animate-pulse h-[38px] bg-gray-100 flex-grow-1 rounded-full"></div>
        <div className="animate-pulse h-[38px] bg-gray-100 flex-grow-1 rounded-full"></div>
      </div>
      <div className="flex justify-end gap-1 ml-auto mb-4 max-w-[200px]">
        <div className="animate-pulse h-[34px] bg-gray-100 flex-grow-1 rounded-full"></div>
        <div className="animate-pulse h-[34px] bg-gray-100 flex-grow-1 rounded-full"></div>
        <div className="animate-pulse h-[34px] bg-gray-100 flex-grow-1 rounded-full"></div>
      </div>
      <div className="animate-pulse rounded-lg bg-gray-100 flex h-11 w-full mb-2"></div>
      <TableSkeleton rows={20} cols={7} />
    </>
  );
}

export default function DicomsTable({
  userId,
  userRoleId,
}: {
  userId: string;
  userRoleId: string;
}) {
  useScrollRestorationLocalStorage("/admin/dicoms");

  const [activeUserId, setActiveUserId] = useState(userId);

  const { data: users, isLoading: isLoadingUsers } = useSWR(
    adminActiveUsersKey,
    usersFetcher
  );

  const { data: permissions, isLoading: isLoadingPermissions } = useSWR(
    `role-permissions-${userRoleId}-${REQUIRED_PERMISSIONS.join(",")}`,
    () => checkPermissions(userRoleId, REQUIRED_PERMISSIONS)
  );

  if (isLoadingUsers || isLoadingPermissions) return <Skeleton />;
  if (!permissions?.[Permissions.VIEW_DICOMS]) return <NoAccess />;

  const canViewOther = permissions[Permissions.VIEW_OTHER_DICOMS];
  const canViewNew = permissions[Permissions.VIEW_NEW_REPORTS];
  const canViewViewed = permissions[Permissions.VIEW_VIEWED_REPORTS];
  const canViewDraft = permissions[Permissions.VIEW_DRAFT_REPORTS];
  const canViewCompleted = permissions[Permissions.VIEW_COMPLETED_REPORTS];

  return (
    <>
      {canViewOther && (
        <Suspense>
          <UsersSelector
            users={users}
            activeUserId={activeUserId}
            onChange={setActiveUserId}
            localStorageKey="activeUserIdSelected"
          />
        </Suspense>
      )}
      <Suspense>
        <Pagination
          tableName="dicom"
          userRoleId={userRoleId}
          userId={canViewOther ? activeUserId : userId}
          canViewNew={canViewNew}
          canViewViewed={canViewViewed}
          canViewDraft={canViewDraft}
          canViewCompleted={canViewCompleted}
        />
      </Suspense>
    </>
  );
}