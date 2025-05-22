"use client";

import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import PaginationReports from "@/components/PaginationReports";

export default function ReportsTable({
  userId,
  userRoleId,
  userTemplateId,
}: {
  userId: string;
  userRoleId: string;
  userTemplateId: string;
}) {
  const {
    hasPermission: hasDownloadReportPermission,
    isLoading: isLoadingDownloadReportPermission,
  } = useCheckPermission(userRoleId, Permissions.DOWNLOAD_REPORT);

  if (!hasDownloadReportPermission || isLoadingDownloadReportPermission)
    return null;

  return (
    <PaginationReports
      tableName="dicom"
      userRoleId={userRoleId}
      userId={userId}
      userTemplateId={userTemplateId}
    />
  );
}
