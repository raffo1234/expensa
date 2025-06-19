import DOCXPreview from "@/components/DOCXPreview";
import GeneratePDFButton from "@/components/GeneratePDFButton";
import useCheckPermission from "@/hooks/useCheckPermission";
import { DicomType } from "@/types/dicomType";
import { Permissions } from "@/types/propertyState";

export default function DownloadButtons({
  dicom,
  userRoleId,
}: {
  dicom: DicomType;
  userRoleId: string;
}) {
  const { hasPermission: canDownload, isLoading: isLoadingCanDownload } =
    useCheckPermission(userRoleId, Permissions.DOWNLOAD_REPORT);

  if (isLoadingCanDownload) return null;

  return canDownload ? (
    <div className="flex items-center gap-2">
      <GeneratePDFButton dicom={dicom} label="PDF" />
      <DOCXPreview dicom={dicom} />
    </div>
  ) : null;
}
