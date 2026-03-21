"use client";

import { ICON_SIZE } from "@/constants";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import CircularSecondaryButton from "./CircularSecondaryButton";

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
    <CircularSecondaryButton
      onMouseEnter={() => router.prefetch(`/admin/dicoms/${dicomId}`)}
      href={`/admin/dicoms/${dicomId}`}
      title={title}
      isActive={true}
    >
      <Icon
        icon={
          dicomState === DicomStateEnum.COMPLETED
            ? "solar:file-check-linear"
            : "solar:document-add-linear"
        }
        fontSize={ICON_SIZE}
      />
    </CircularSecondaryButton>
  );
}
