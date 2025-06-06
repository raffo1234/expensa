"use client";

import Pagination from "@/components/Pagination";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";

export default function DicomsTable({
  userId,
  userRoleId,
}: {
  userId: string;
  userRoleId: string;
}) {
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
    isLoading ||
    isLoadingCanViewNew ||
    isLoadingCanViewViewed ||
    isLoadingCanViewDraft ||
    isLoadingCanViewCompleted
  )
    return null;

  if (!canViewDicoms) return null;

  return (
    <Pagination
      tableName="dicom"
      userRoleId={userRoleId}
      userId={userId}
      canViewNew={canViewNew}
      canViewViewed={canViewViewed}
      canViewDraft={canViewDraft}
      canViewCompleted={canViewCompleted}
    />
  );
}
