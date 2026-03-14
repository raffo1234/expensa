import { useState } from "react";
import { Popover } from "react-tiny-popover";

export default function PopoverInnerButton({
  title,
  isDisabled = false,
  children = "",
}: {
  title: string;
  isDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onMouseEnter = () => setIsPopoverOpen(true);
  const onMouseLeave = () => setIsPopoverOpen(false);

  return (
    <Popover
      isOpen={true}
      positions={["top", "bottom"]}
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
      <span
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`${isDisabled
          ? "cursor-not-allowed opacity-50 pointer-events-none"
          : `cursor-pointer`
          }`}
      >
        {children}
      </span>
    </Popover>
  );
}
