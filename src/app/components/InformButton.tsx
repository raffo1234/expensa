"use client";

import { ICON_SIZE } from "@/constants";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import CircularSecondaryButton from "./CircularSecondaryButton";

export default function InformButton({
  dicomId,
  dicomState,
  href,
}: {
  dicomId: string;
  dicomState: string;
  href?: string; 
}) {
  const title = dicomState !== DicomStateEnum.COMPLETED ? "Inform" : "Amend";
  const router = useRouter();
  const resolvedHref = href ?? `/admin/dicoms/${dicomId}`;

  return (
    <CircularSecondaryButton
      onMouseEnter={() => router.prefetch(resolvedHref)}
      href={resolvedHref}
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
