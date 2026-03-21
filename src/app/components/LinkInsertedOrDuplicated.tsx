"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { ICON_SIZE } from "@/constants";
import CircularSecondaryButton from "./CircularSecondaryButton";

function LinkInsertedOrDuplicatedContent({ isDuplicated }: { isDuplicated: boolean }) {
  return (
    <Icon
      icon={`${isDuplicated ? "sidekickicons:check-double-20-solid" : "akar-icons:check"}`}
      fontSize={ICON_SIZE}
    />
  );
}

export default function LinkInsertedOrDuplicated({
  isDuplicated,
  id,
  state,
  userRoleId,
}: {
  isDuplicated: boolean;
  id: string;
  state: string;
  userRoleId: string;
}) {
  const router = useRouter();
  const { hasPermission: canViewDicoms, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS,
  );

  if (!id || isLoading) return null;

  if (canViewDicoms) {
    return (
      <CircularSecondaryButton
        key={id}
        title={`Go to ${state} study`}
        target="_blank"
        href={`/admin/dicoms/${id}`}
        onMouseEnter={() => router.prefetch(`/admin/dicoms/${id}`)}
        className="hover:underline text-cyan-500 underline-offset-4"
      >
        <LinkInsertedOrDuplicatedContent isDuplicated={isDuplicated} />
      </CircularSecondaryButton>
    );
  }

  return <LinkInsertedOrDuplicatedContent isDuplicated={isDuplicated} />;
}
