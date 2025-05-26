"use client";

import FallbackPermission from "@/components/FallbackPermission";
import { Permissions } from "@/types/propertyState";
import Uploader from "@/components/Uploader";
import useCheckPermission from "@/hooks/useCheckPermission";

export default function UploaderPage({
  userRoleId,
  userId,
}: {
  userRoleId: string;
  userId: string;
}) {
  const { hasPermission, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.UPLOAD_DICOM
  );

  if (isLoading)
    return (
      <div className="animate-pulse w-full h-[266px] rounded-2xl border border-dashed border-gray-200"></div>
    );

  if (!hasPermission) return <FallbackPermission />;

  return <Uploader userId={userId} />;
}
