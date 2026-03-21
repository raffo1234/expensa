import { useState } from "react";
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

  const inner = (
    <span
      onMouseEnter={() => !isDisabled && setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
      className={`flex p-2 items-center justify-center w-full h-full ${isDisabled ? "pointer-events-none" : ""}`}
    >
      {children}
    </span>
  );

  if (!title) return inner;

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
