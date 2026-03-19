import { DicomInstance } from "@/types/dicomType";
import DownloadAllInstancesZipped from "./DownloadAllInstancesZipped";
import DownloadZippedStudyButton from "./DownloadZippedStudyButton";
import hasDicomInstances from "@/lib/hasDicomInstances";

export default function DownloadStudyButton({
  dicomIds,
  isButtonActive = false,
  filename = "",
  dicomUrl = null,
  instances = [],
}: {
  dicomIds: string[];
  isButtonActive?: boolean;
  filename?: string;
  dicomUrl?: string | null;
  instances?: DicomInstance[] | null;
}) {
  const hasInstances = hasDicomInstances(instances);

  return (
    <>
      {dicomUrl ? (
        <DownloadZippedStudyButton isButtonActive={true} zippedDicomUrl={dicomUrl} />
      ) : null}
      {hasInstances ? (
        <DownloadAllInstancesZipped
          isButtonActive={isButtonActive}
          filename={filename}
          fileIds={dicomIds}
        />
      ) : null}
    </>
  );
}
