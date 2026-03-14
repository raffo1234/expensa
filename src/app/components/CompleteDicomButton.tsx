import { DicomStateEnum } from "@/enums/dicomStateEnum";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";

export default function CompleteDicomButton({
  dicomState,
  userRoleId,
  onClick,
}: {
  dicomState: DicomStateEnum | undefined;
  userRoleId: string;
  onClick: () => void;
}) {
  const { hasPermission: canComplete, isLoading: isLoadingCanComplete } =
    useCheckPermission(userRoleId, Permissions.COMPLETE_REPORT);

  if (isLoadingCanComplete) return null;

  return dicomState !== DicomStateEnum.COMPLETED && canComplete ? (
    <button
      onClick={onClick}
      title={DicomStateEnum.COMPLETED}
      type="button"
      className="px-6 py-2 text-cyan-500 border-cyan-200 cursor-pointer border bg-cyan-50 rounded-full"
    >
      {DicomStateEnum.COMPLETED}
    </button>
  ) : null;
}
