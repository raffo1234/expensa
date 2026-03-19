import Link from "next/link";
import InnerCircularButton from "./InnerCircularButton";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";

export default function DownloadZippedStudyButton({ zippedDicomUrl }: { zippedDicomUrl: string }) {
  return (
    <Link
      target="_blank"
      href={zippedDicomUrl}
      download
      title="Download Zip"
      className="inline-block w-fit"
    >
      <InnerCircularButton title="Download Zip">
        <Icon icon="solar:cloud-download-outline" fontSize={ICON_SIZE} />
      </InnerCircularButton>
    </Link>
  );
}
