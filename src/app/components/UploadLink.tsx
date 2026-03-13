import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

export default function UploadLink() {
  return (
    <Link
      href="/admin/dicom"
      title="Upload Dicoms"
      className="px-6 w-fit mx-auto text-white justify-center py-2 rounded-full bg-black flex gap-2 items-center"
    >
      <Icon
        icon="solar:cloud-upload-broken"
        fontSize={ICON_SIZE}
      />
      <span>Upload</span>
    </Link>
  );
}
