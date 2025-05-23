"use client";

import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import { Permissions } from "@/types/propertyState";
import Uploader from "@/components/Uploader";

export default function UploaderPage({
  userRoleId,
  userId,
}: {
  userRoleId: string;
  userId: string;
}) {
  return (
    <CheckPermission
      userRoleId={userRoleId}
      requiredPermission={Permissions.UPLOAD_DICOM}
      fallback={<FallbackPermission />}
    >
      <Uploader userId={userId} />
    </CheckPermission>
  );
}
