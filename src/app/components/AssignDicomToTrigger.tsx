"use client";

import { useGlobalState } from "@/lib/globalState";
import AssignDicomTo from "@/components/AssignDicomTo";
import { useDicomHasAssignments } from "@/hooks/useDicomHasAssignments";

export default function AssignDicomToTrigger({
  dicomId,
  userId,
}: {
  dicomId: string;
  userId: string;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();
  const { data: hasAssignments, isLoading } = useDicomHasAssignments(dicomId);

  const onClick = () => {
    setModalContent(<AssignDicomTo dicomId={dicomId} userId={userId} />);
    setModalOpen(true);
  };

  if (isLoading) return "Loading ...";

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
