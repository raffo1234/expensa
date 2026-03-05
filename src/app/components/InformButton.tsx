"use client";

import { ICON_SIZE } from "@/constants";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useState } from "react";
import { Popover } from "react-tiny-popover";

export default function InformButton({
  dicomId,
  dicomState,
}: {
  dicomId: string;
  dicomState: string;
}) {
  const title = dicomState !== DicomStateEnum.COMPLETED ? "Inform" : "Amend";
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = () => setIsPopoverOpen(true);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <Popover
      isOpen={true}
      positions={["top", "bottom"]}
      padding={12}
      content={
        <div
          className={`${isPopoverOpen ? "opacity-100 -translate-y-0" : "opacity-0 -translate-y-4"} 
                  pointer-events-none text-white px-3 py-2 max-w-48 bg-slate-800 rounded-lg transition-all duration-500 ease-in-out`}
        >
          {title}
        </div>
      }
    >
      <Link
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
        href={`/admin/dicoms/${dicomId}`}
        title={title}
        className="p-2 w-fit block border border-cyan-400 bg-cyan-400 text-white rounded-full cursor-pointer"
      >
        <Icon
          icon={
            dicomState === DicomStateEnum.COMPLETED
              ? "solar:file-check-linear"
              : "solar:document-add-linear"
          }
          fontSize={ICON_SIZE}
        />
      </Link>
    </Popover>
  );
}
