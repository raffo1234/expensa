"use client";

import { useGlobalState } from "@/lib/globalState";
import AssignDicomTo from "@/components/AssignDicomTo";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import { useDicomHasAssignments } from "@/hooks/useDicomHasAssignments";

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
  const { hasPermission: canAssign, isLoading: isLoadingCanAssign } =
    useCheckPermission(userRoleId, Permissions.ASSIGN_DICOM_TO_USERS);

  const onClick = () => {
    setModalContent(<AssignDicomTo dicomIds={dicomIds} userId={userId} />);
    setModalOpen(true);
  };

  const { data: hasAssignments, isLoading } = useDicomHasAssignments(
    dicomIds[0] as string
  );

  if (isLoadingCanAssign || isLoading) return null;
  if (!canAssign) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-sm text-cyan-500 text-shadow-gray-900 underline underline-offset-3"
    >
      {dicomIds.length === 1 ? (
        <>{hasAssignments ? "Assigned" : "Assign to"}</>
      ) : (
        "Assignment"
      )}
    </button>
  );
}
