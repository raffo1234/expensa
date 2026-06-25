"use client";

import { useState } from "react";
import { Popover } from "react-tiny-popover";

export default function InputWithTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Popover
      isOpen={hovered}
      positions={["top", "bottom"]}
      padding={8}
      content={
        <div className="pointer-events-none font-semibold text-white px-3 py-2 bg-slate-800 rounded-lg text-sm">
          {label}
        </div>
      }
    >
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {children}
      </div>
    </Popover>
  );
}
