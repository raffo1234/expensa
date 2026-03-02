import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import AssignDicomToTrigger from "./AssignDicomToTrigger";
import { ICON_SIZE } from "@/constants";

function LinkInsertedOrDuplicatedContent({
  state,
  isDuplicated,
}: {
  state: string;
  isDuplicated: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span>{state}</span>
      <div className="rounded-sm w-5 h-5 flex items-center justify-center bg-cyan-400 text-white">
        <Icon
          icon={`${isDuplicated ? "akar-icons:double-check" : "akar-icons:check"}`}
          fontSize={ICON_SIZE}
        />
      </div>
    </div>
  );
}

export default function LinkInsertedOrDuplicated({
  isDuplicated,
  id,
  state,
  userRoleId,
  userId,
}: {
  isDuplicated: boolean;
  id: string;
  state: string;
  userRoleId: string;
  userId: string;
}) {
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
          className="text-sm hover:underline text-cyan-500 mt-0.5 first:mt-0 block underline-offset-4"
        >
          <LinkInsertedOrDuplicatedContent isDuplicated={isDuplicated} state={state} />
        </Link>
        <AssignDicomToTrigger userRoleId={userRoleId} dicomIds={[id]} userId={userId} />
      </>
    );
  }

  return <LinkInsertedOrDuplicatedContent isDuplicated={isDuplicated} state={state} />;
}
