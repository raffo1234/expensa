"use client";

import { useEffect, useState } from "react";
import { Popover } from "react-tiny-popover";

export default function PopoverInnerButton({
  title,
  isDisabled = false,
  children,
  positions = ["top", "bottom"],
}: {
  title?: React.ReactNode;
  isDisabled?: boolean;
  children?: React.ReactNode;
  positions?: ["top" | "bottom" | "left" | "right", ...("top" | "bottom" | "left" | "right")[]];
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // The tooltip lives in a portal that only exists in the browser. Rendering it
  // during server rendering/hydration makes the HTML differ (hydration error),
  // so it's attached after mount; it stays mounted so it can fade in and out.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const inner = (
    <span
      onMouseEnter={() => !isDisabled && setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
      className={`flex p-2 items-center justify-center w-full h-full ${isDisabled ? "pointer-events-none" : ""}`}
    >
      {children}
    </span>
  );

  if (!title || !mounted) return inner;

  return (
    <Popover
      isOpen={true}
      positions={positions}
      padding={12}
      content={
        <div
          className={`${isPopoverOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
          pointer-events-none text-white px-3 py-2 max-w-48 bg-slate-800 rounded-lg transition-all duration-300 ease-in-out`}
        >
          {title}
        </div>
      }
    >
      {inner}
    </Popover>
  );
}
