"use client";

import { useGlobalState } from "@/lib/globalState";
import AssignDicomTo from "@/components/AssignDicomTo";
import { useDicomHasAssignments } from "@/hooks/useDicomHasAssignments";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";

export default function AssignDicomToTrigger({
  dicomId,
  userId,
  userRoleId,
}: {
  dicomId: string;
  userId: string;
  userRoleId: string;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();
  const { data: hasAssignments, isLoading } = useDicomHasAssignments(dicomId);

  const { hasPermission: canAssign, isLoading: isLoadingCanAssign } =
    useCheckPermission(userRoleId, Permissions.ASSIGN_RESIDENT);

  const onClick = () => {
    setModalContent(<AssignDicomTo dicomId={dicomId} userId={userId} />);
    setModalOpen(true);
  };

  if (isLoading || isLoadingCanAssign) return null;

  if (!canAssign) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-sm text-cyan-500 text-shadow-gray-900 underline underline-offset-3"
    >
      {hasAssignments ? "Assigned" : "Assign to"}
    </button>
  );
}
