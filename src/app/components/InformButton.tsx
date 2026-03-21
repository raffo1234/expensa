"use client";

import { ICON_SIZE } from "@/constants";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PopoverInnerButton from "./PopoverInnerButton";

export default function InformButton({
  dicomId,
  dicomState,
}: {
  dicomId: string;
  dicomState: string;
}) {
  const title = dicomState !== DicomStateEnum.COMPLETED ? "Inform" : "Amend";
  const router = useRouter();

  return (
    <Link
      onMouseEnter={() => router.prefetch(`/admin/dicoms/${dicomId}`)}
      href={`/admin/dicoms/${dicomId}`}
      title={title}
      className="w-fit block border border-cyan-400 bg-cyan-400 text-white rounded-full cursor-pointer"
    >
      <PopoverInnerButton title={title}>
        <Icon
          icon={
            dicomState === DicomStateEnum.COMPLETED
              ? "solar:file-check-linear"
              : "solar:document-add-linear"
          }
          fontSize={ICON_SIZE}
        />
      </PopoverInnerButton>
    </Link>
  );
}
