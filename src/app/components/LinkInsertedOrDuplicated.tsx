import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";

function LinkInsertedOrDuplicatedContent({
  state,
  isDuplicated,
  uploadPercentage,
}: {
  state: string;
  isDuplicated: boolean;
  uploadPercentage: number;
}) {
  return (
    <div className="px-3 block py-1 text-center w-full">
      <Icon
        icon={`${
          isDuplicated ? "solar:check-read-bold" : "solar:verified-check-bold"
        }`}
        fontSize={24}
        className="text-cyan-400 inline-block mr-2"
      />
      <span>{state}</span> - <span>{uploadPercentage}%</span>
    </div>
  );
}

export default function LinkInsertedOrDuplicated({
  isDuplicated,
  id,
  state,
  uploadPercentage,
  userRoleId,
}: {
  isDuplicated: boolean;
  id: string;
  state: string;
  uploadPercentage: number;
  userRoleId: string;
}) {
  const { hasPermission: canViewDicoms, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS
  );

  if (isLoading) return null;

  if (canViewDicoms) {
    return (
      <Link
        key={id}
        target="_blank"
        href={`/admin/dicoms/${id}`}
        className="text-center underline hover:text-cyan-500 transition-colors duration-300 underline-offset-4"
      >
        <LinkInsertedOrDuplicatedContent
          isDuplicated={isDuplicated}
          uploadPercentage={uploadPercentage}
          state={state}
        />
      </Link>
    );
  }

  return (
    <LinkInsertedOrDuplicatedContent
      isDuplicated={isDuplicated}
      uploadPercentage={uploadPercentage}
      state={state}
    />
  );
}
