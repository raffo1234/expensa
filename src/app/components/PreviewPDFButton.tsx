import { DicomType } from "@/types/dicomType";
import GeneratePDFButton from "./GeneratePDFButton";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";

export default function PreviewPDFButton({
  dicomId,
  isDownloadable,
  userRoleId,
}: {
  dicomId: DicomType["id"];
  userRoleId: string;
  isDownloadable: boolean;
}) {
  const { hasPermission: canDownload, isLoading: isLoadingCanDownload } =
    useCheckPermission(userRoleId, Permissions.DOWNLOAD_REPORT);

  if (isLoadingCanDownload) return null;

  return canDownload ? (
    <GeneratePDFButton isDownloadable={isDownloadable} dicomId={dicomId} />
  ) : null;
}
