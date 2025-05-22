import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

export default function UploadButton() {
  return (
    <Link
      href="/admin/dicom"
      title="Upload Dicoms"
      className="px-6 text-white justify-center py-2 rounded-full bg-black flex gap-2 items-center"
    >
      <span>Upload</span>
      <Icon icon="solar:add-circle-linear" fontSize={24}></Icon>
    </Link>
  );
}
