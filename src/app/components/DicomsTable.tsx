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
  const { hasPermission, isLoading: isLoading } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS
  );

  if (!hasPermission || isLoading) return null;

  return (
    <Pagination tableName="dicom" userRoleId={userRoleId} userId={userId} />
  );
}
