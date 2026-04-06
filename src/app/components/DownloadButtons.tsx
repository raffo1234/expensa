import DOCXPreview from "@/components/DOCXPreview";
import GeneratePDFButton from "@/components/GeneratePDFButton";
import useCheckPermission from "@/hooks/useCheckPermission";
import { DicomType } from "@/types/dicomType";
import { Permissions } from "@/types/propertyState";

export default function DownloadButtons({
  dicomId,
  userRoleId,
  liveReport,
}: {
  dicomId: DicomType["id"];
  userRoleId: string;
  liveReport?: string;
}) {
  const { hasPermission: canDownload, isLoading: isLoadingCanDownload } = useCheckPermission(
    userRoleId,
    Permissions.DOWNLOAD_REPORT,
  );

  if (isLoadingCanDownload) return null;

  return canDownload ? (
    <div className="flex items-center gap-2">
      <GeneratePDFButton dicomId={dicomId} liveReport={liveReport} />
      <DOCXPreview dicomId={dicomId} liveReport={liveReport} />
    </div>
  ) : null;
}
