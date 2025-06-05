import { DicomStateEnum } from "@/enums/dicomStateEnum";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";

export default function CompleteDicomButton({
  dicomState,
  userRoleId,
  onClick,
}: {
  dicomState: DicomStateEnum;
  userRoleId: string;
  onClick: () => void;
}) {
  const { hasPermission: canComplete, isLoading: isLoadingCanComplete } =
    useCheckPermission(userRoleId, Permissions.COMPLETE_REPORT);

  if (isLoadingCanComplete) return null;

  return dicomState === DicomStateEnum.DRAFT && canComplete ? (
    <button
      onClick={onClick}
      title={`Save as ${DicomStateEnum.COMPLETED}`}
      type="button"
      className="px-6 py-2 font-semibold text-cyan-600 border-cyan-200 cursor-pointer border bg-cyan-50 rounded-xl"
    >
      Save as {DicomStateEnum.COMPLETED}
    </button>
  ) : null;
}
