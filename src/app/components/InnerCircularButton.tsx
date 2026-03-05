import { useState } from "react";
import { Popover } from "react-tiny-popover";

export default function InnerCircularButton({
  children,
  title,
  isActive = false,
}: {
  isActive: boolean;
  children: React.ReactNode;
  title: string;
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
          className={`${isPopoverOpen ? "opacity-100 -translate-y-0" : "opacity-0 -translate-y-4"} 
                  pointer-events-none text-white px-3 py-2 max-w-48 bg-slate-800 rounded-lg transition-all duration-500 ease-in-out`}
        >
          {title}
        </div>
      }
    >
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`p-2 cursor-pointer transition-colors duration-300 rounded-full ${isActive ? "bg-cyan-400 hover:bg-cyan-500 text-white" : "text-cyan-400 border border-cyan-400 bg-white hover:bg-cyan-50"}`}
      >
        {children}
      </div>
    </Popover>
  );
}
