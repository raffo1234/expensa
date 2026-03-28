"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { ICON_SIZE } from "@/constants";
import { useTranslations } from "next-intl";
import FallBackSeeDicomsLink from "./FallBackSeeDicomsLink";

export default function ViewAllDicomsLink({ userRoleId }: { userRoleId: string }) {
  const { hasPermission: canViewAllDicoms, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS,
  );
  const t = useTranslations("DicomPage");

  if (isLoading) return <FallBackSeeDicomsLink />;
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
