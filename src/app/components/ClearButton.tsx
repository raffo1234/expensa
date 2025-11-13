"use client";

import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { Popover } from "react-tiny-popover";

export default function ClearButton({ clearLocalStorage }: { clearLocalStorage: () => void }) {
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
          Clear all filters
        </div>
      }
    >
      <button
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
        title="Clear all filters"
        onClick={clearLocalStorage}
        className="cursor-pointer text-cyan-400 hover:text-cyan-600 transition-colors duration-300 p-2 border border-cyan-100 rounded-full"
      >
        <Icon icon="pajamas:clear-all" fontSize={ICON_SIZE}></Icon>
      </button>
    </Popover>
  );
}
