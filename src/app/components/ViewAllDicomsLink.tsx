"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { ICON_SIZE } from "@/constants";
import { useTranslations } from "next-intl";

function FallBackLink() {
  return (
    <div className="h-11 w-[110px] rounded-lg animate-pulse bg-gray-100" />
  )
}

export default function ViewAllDicomsLink({ userRoleId }: { userRoleId: string }) {
  const { hasPermission: canViewAllDicoms, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS,
  );
  const t = useTranslations("DicomPage");

  if (isLoading) return <FallBackLink />
  if (!canViewAllDicoms) return null;

  return (
    <Link
      href="/admin/dicoms"
      className="flex w-fit items-center gap-2 cursor-pointer text-center p-3 text-cyan-400 group"
      title="View All"
      target="_blank"
    >
      <Icon icon="solar:file-text-line-duotone" fontSize={ICON_SIZE} />
      <span className="whitespace-nowrap group-hover:underline"> {t("button")}</span>
    </Link>
  );
}
