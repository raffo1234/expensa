import { DicomInstance } from "@/types/dicomType";
import DownloadAllInstancesZipped from "./DownloadAllInstancesZipped";
import DownloadZippedStudyButton from "./DownloadZippedStudyButton";
import hasDicomInstances from "@/lib/hasDicomInstances";

export default function DownloadStudyButton({
  dicomIds,
  isButtonActive = false,
  dicomUrl = null,
  instances = [],
  patientName = "",
}: {
  dicomIds: string[];
  isButtonActive?: boolean;
  dicomUrl?: string | null;
  instances?: DicomInstance[] | null;
  patientName?: string;
}) {
  const hasInstances = hasDicomInstances(instances);

  if (dicomUrl)
    return <DownloadZippedStudyButton isButtonActive={isButtonActive} zippedDicomUrl={dicomUrl} />;

  if (hasInstances)
    return (
      <DownloadAllInstancesZipped
        isButtonActive={isButtonActive}
        fileIds={dicomIds}
        patientName={patientName}
      />
    );

  return null;
}
