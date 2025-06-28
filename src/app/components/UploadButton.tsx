import { ICON_SIZE } from "@/constants";
import Link from "next/link";

export default function UploadButton() {
  return (
    <Link
      href="/admin/dicom"
      title="Upload Dicoms"
      className="px-6 w-fit mx-auto text-white justify-center py-2 rounded-full bg-black flex gap-2 items-center"
    >
      <span>Upload</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 24 24"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M15 12h-3m0 0H9m3 0V9m0 3v3" />
        </g>
      </svg>
    </Link>
  );
}
