import DownloadAllInstancesZipped from "./DownloadAllInstancesZipped";
import DownloadZippedStudyButton from "./DownloadZippedStudyButton";

export default function DownloadStudyButton({
  dicomIds,
  dicomUrl,
  hasInstances,
  filename,
}: {
  dicomIds: string[];
  dicomUrl: string;
  hasInstances: boolean;
  filename?: string;
}) {
  return (
    <>
      {dicomUrl ? <DownloadZippedStudyButton zippedDicomUrl={dicomUrl} /> : null}
      {hasInstances ? <DownloadAllInstancesZipped filename={filename} fileIds={dicomIds} /> : null}
    </>
  );
}
