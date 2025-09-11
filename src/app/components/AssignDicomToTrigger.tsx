"use client";

import { useGlobalState } from "@/lib/globalState";
import AssignDicomTo from "@/components/AssignDicomTo";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import { useDicomHasAssignments } from "@/hooks/useDicomHasAssignments";

function AssignmentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M4 3H3a1 1 0 0 0-1 1v14l1.5 3L5 18V4a1 1 0 0 0-1-1Z" />
        <path
          strokeLinecap="round"
          d="M21 12.001v-4c0-2.358 0-3.536-.732-4.269C19.535 3 18.357 3 16 3h-3c-2.357 0-3.536 0-4.268.732C8 4.465 8 5.643 8 8.001v8c0 2.358 0 3.537.732 4.27c.62.62 1.561.714 3.268.729m0-14h5m-5 4h5"
        />
        <path strokeLinecap="round" d="M14 19s1.5.5 2.5 2c0 0 1.5-4 5.5-6M2 7h3" />
      </g>
    </svg>
  );
}

export default function AssignDicomToTrigger({
  dicomIds,
  userId,
  userRoleId,
}: {
  dicomIds: string[];
  userId: string;
  userRoleId: string;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();
  const { hasPermission: canAssign, isLoading: isLoadingCanAssign } = useCheckPermission(
    userRoleId,
    Permissions.ASSIGN_DICOM_TO_USERS,
  );

  const onClick = () => {
    setModalContent(<AssignDicomTo dicomIds={dicomIds} userId={userId} />);
    setModalOpen(true);
  };

  const { data: hasAssignments, isLoading } = useDicomHasAssignments(dicomIds[0] as string);

  if (isLoadingCanAssign || isLoading) return null;
  if (!canAssign) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer block text-sm text-cyan-500 text-shadow-gray-900 underline underline-offset-3"
    >
      {dicomIds.length === 1 ? (
        <div className={`p-1 ${hasAssignments ? "bg-cyan-400 text-white" : "bg-white"} rounded-lg`}>
          <AssignmentIcon />
        </div>
      ) : (
        "Assignments"
      )}
    </button>
  );
}
