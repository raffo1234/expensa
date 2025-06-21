"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";

export default function ViewAllDicomsLink({
  userRoleId,
}: {
  userRoleId: string;
}) {
  const { hasPermission: canViewAllDicoms } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS
  );

  if (!canViewAllDicoms) return null;
  return (
    <Link
      href="/admin/dicoms"
      className="flex w-fit items-center gap-2 cursor-pointer text-center p-3 text-cyan-400 group"
      title="View All"
      target="_blank"
    >
      <Icon icon="solar:file-text-line-duotone" fontSize={24} />
      <span className="group-hover:underline">View All</span>
    </Link>
  );
}
