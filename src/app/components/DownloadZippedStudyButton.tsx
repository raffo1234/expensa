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
  return (
    <Link
      target="_blank"
      href={zippedDicomUrl}
      download
      title="Download Zip"
      className="inline-block w-fit"
    >
      <InnerCircularButton title="Download Zip" isActive={isButtonActive}>
        <Icon icon="solar:cloud-download-outline" fontSize={ICON_SIZE} />
      </InnerCircularButton>
    </Link>
  );
}
