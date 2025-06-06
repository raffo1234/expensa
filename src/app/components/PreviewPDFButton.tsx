import { DicomType } from "@/types/dicomType";
import GeneratePDFButton from "./GeneratePDFButton";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";

export default function PreviewPDFButton({
  dicom,
  isDownloadable,
  userRoleId,
}: {
  userRoleId: string;
  dicom: DicomType;
  isDownloadable: boolean;
}) {
  const { hasPermission: canDownload, isLoading: isLoadingCanDownload } =
    useCheckPermission(userRoleId, Permissions.DOWNLOAD_REPORT);

  if (isLoadingCanDownload) return null;

  return canDownload ? (
    <GeneratePDFButton isDownloadable={isDownloadable} dicom={dicom} />
  ) : null;
}
