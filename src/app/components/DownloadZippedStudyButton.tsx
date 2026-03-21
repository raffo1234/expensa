import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";
import CircularSecondaryButton from "./CircularSecondaryButton";

export default function DownloadZippedStudyButton({
  zippedDicomUrl,
  isButtonActive = false,
}: {
  zippedDicomUrl: string;
  isButtonActive?: boolean;
}) {
  const title = "Download Zip";

  return (
    <CircularSecondaryButton
      target="_blank"
      isActive={isButtonActive}
      href={zippedDicomUrl}
      title={title}
      download
      className="w-fit inline-block"
    >
      <Icon icon="solar:arrow-down-linear" fontSize={ICON_SIZE} />
    </CircularSecondaryButton>
  );
}
