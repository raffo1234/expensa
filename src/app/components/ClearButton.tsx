"use client";

import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { Popover } from "react-tiny-popover";
import InnerCircularButton from "./InnerCircularButton";

export default function ClearButton({ clearLocalStorage }: { clearLocalStorage: () => void }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = () => setIsPopoverOpen(true);
  const closePopover = () => setIsPopoverOpen(false);
  const title = "Clear all filters";
  return (
    <Popover
      isOpen={true}
      positions={["top", "bottom"]}
      padding={12}
      content={
        <div
          className={`${isPopoverOpen ? "opacity-100 -translate-y-0" : "opacity-0 -translate-y-4"} pointer-events-none text-white px-3 py-2 max-w-48 bg-slate-800 rounded-lg transition-all duration-500 ease-in-out`}
        >
          Clear all filters
        </div>
      }
    >
      <button
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
        onClick={clearLocalStorage}
        title={title}
      >
        <InnerCircularButton title={title}>
          <Icon icon="pajamas:clear-all" fontSize={ICON_SIZE}></Icon>
        </InnerCircularButton>
      </button>
    </Popover>
  );
}
