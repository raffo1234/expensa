import Link from "next/link";
import InnerCircularButton from "./InnerCircularButton";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";

export default function DownloadZippedStudyButton({
  zippedDicomUrl,
  isButtonActive = false,
}: {
  zippedDicomUrl: string;
  isButtonActive?: boolean;
}) {
  const title = "Download Zip";
  return (
    <Link
      target="_blank"
      href={zippedDicomUrl}
      download
      title={title}
      className="inline-block w-fit"
    >
      <InnerCircularButton title={title} isActive={isButtonActive}>
        <Icon icon="solar:arrow-down-linear" fontSize={ICON_SIZE} />
      </InnerCircularButton>
    </Link>
  );
}
