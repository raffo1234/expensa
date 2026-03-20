"use client";

import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Popover } from "react-tiny-popover";
import TargetBlankIcon from "./TargetBlankIcon";

export default function FinalStep({ label = "" }: { label?: string }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const t = useTranslations("FinalStep");

  const handleMouseEnter = () => {
    setIsPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    setIsPopoverOpen(false);
  };

  return (
    <Popover
      isOpen={true}
      positions={["top"]}
      padding={12}
      content={
        <div
          className={`${isPopoverOpen ? "opacity-100 -translate-y-0" : "opacity-0 -translate-y-4"} 
                                            pointer-events-none p-4 max-w-56 bg-slate-800 rounded-xl transition-all duration-500 ease-in-out`}
        >
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
          <h4 className="text-white font-semibold mb-2">{t("title")}</h4>
          <p className="text-slate-200">{t("description")}</p>
        </div>
      }
    >
      <Link
        href="/admin/my-studies"
        target="_blank"
        title={t("title")}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="self-stretch flex gap-2 items-center w-fit text-cyan-500 hover:text-cyan-500 cursor-pointer hover:underline underline-offset-4"
      >
        {label}
        <Icon icon="solar:hand-heart-linear" fontSize={ICON_SIZE} />
      </Link>
    </Popover>
  );
}
