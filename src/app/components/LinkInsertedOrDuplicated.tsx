"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { ICON_SIZE } from "@/constants";
import InnerCircularButton from "./InnerCircularButton";

function LinkInsertedOrDuplicatedContent({
  state,
  isDuplicated,
}: {
  state: string;
  isDuplicated: boolean;
}) {
  return (
    <InnerCircularButton title={`Go to ${state} study`}>
      <Icon
        icon={`${isDuplicated ? "sidekickicons:check-double-20-solid" : "akar-icons:check"}`}
        fontSize={ICON_SIZE}
      />
    </InnerCircularButton>
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

  if (isLoading) return null;

  if (canViewDicoms) {
    return (
      <>
        <Link
          key={id}
          target="_blank"
          href={`/admin/dicoms/${id}`}
          onMouseEnter={() => router.prefetch(`/admin/dicoms/${id}`)}
          className="hover:underline text-cyan-500 underline-offset-4"
        >
          <LinkInsertedOrDuplicatedContent isDuplicated={isDuplicated} state={state} />
        </Link>
      </>
    );
  }

  return <LinkInsertedOrDuplicatedContent isDuplicated={isDuplicated} state={state} />;
}
