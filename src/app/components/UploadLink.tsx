import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

export default function UploadLink({ label = "Upload Studies" }: { label?: string }) {
  return (
    <Link
      href="/admin/dicom"
      title={label}
      className="group relative px-6 w-fit mx-auto py-2.5 rounded-full bg-gray-950 flex gap-2 items-center justify-center overflow-hidden transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md"
    >
      <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none" />
      <Icon
        icon="solar:cloud-upload-broken"
        fontSize={ICON_SIZE}
        className="text-white/80 group-hover:text-white transition-colors duration-200 relative z-10"
      />
      <span className="text-white/90 group-hover:text-white text-sm font-medium tracking-wide transition-colors duration-200 relative z-10">
        {label}
      </span>
    </Link>
  );
}
