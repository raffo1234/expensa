"use client";

import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import PaginationReports from "@/components/PaginationReports";
import NoAccess from "./NoAccess";
import TableSkeleton from "@/components/FormSkeleton";

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

  if (isLoadingDownloadReportPermission) return <TableSkeleton rows={20} cols={7} />;

  if (!hasDownloadReportPermission) return <NoAccess />;

  return (
    <PaginationReports
      templateId={userTemplateId}
      tableName="dicom"
      userRoleId={userRoleId}
      userId={userId}
    />
  );
}
