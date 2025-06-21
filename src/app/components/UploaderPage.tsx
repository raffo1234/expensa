"use client";

import FallbackPermission from "@/components/FallbackPermission";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import UploaderR2 from "./UploaderR2";
import toast from "react-hot-toast";

export default function UploaderPage({
  userRoleId,
  userId,
  userEmail,
}: {
  userRoleId: string;
  userId: string;
  userEmail: string;
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

  return (
    <UploaderR2 userId={userId} userRoleId={userRoleId} userEmail={userEmail} />
  );
}
