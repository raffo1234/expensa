"use client";

import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { useState } from "react";
import { Popover } from "react-tiny-popover";

const STATE_COLORS: Record<DicomStateEnum, string> = {
  [DicomStateEnum.NEW]: "bg-white",
  [DicomStateEnum.VIEWED]: "bg-yellow-300",
  [DicomStateEnum.DRAFT]: "bg-orange-300",
  [DicomStateEnum.COMPLETED]: "bg-cyan-300",
};

const STATES = Object.values(DicomStateEnum);

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getRoundedClass(index: number): string {
  if (index === 0) return "rounded-l-full";
  if (index === STATES.length - 1) return "rounded-r-full";
  return "";
}

function toggleStateFilter(
  state: DicomStateEnum,
  current: string,
  setter: React.Dispatch<React.SetStateAction<DicomStateEnum | null>>,
) {
  const isActive = current === state;
  setter(isActive ? null : state);

  if (isActive) localStorage.removeItem("dicomStateFilter");
  else localStorage.setItem("dicomStateFilter", state);
}

function TooltipContent({ label }: { label: string }) {
  return (
    <div className="pointer-events-none text-white px-3 py-2 max-w-48 bg-slate-800 rounded-lg">
      {toTitleCase(label)}
    </div>
  );
}

interface FilterByStateProps {
  filteredByState: string;
  setFilteredByState: React.Dispatch<React.SetStateAction<DicomStateEnum | null>>;
}

export default function FilterByState({ filteredByState, setFilteredByState }: FilterByStateProps) {
  const [hoveredState, setHoveredState] = useState<DicomStateEnum | null>(null);

  return (
    <div className="flex rounded-full w-full items-center">
      {STATES.map((state, index) => {
        const isActive = filteredByState === state;
        const isHovered = hoveredState === state;

        return (
          <Popover
            key={state}
            isOpen={isHovered}
            positions={["top", "bottom"]}
            padding={12}
            content={<TooltipContent label={state} />}
          >
            <button
              onMouseEnter={() => setHoveredState(state)}
              onMouseLeave={() => setHoveredState(null)}
              onClick={() => toggleStateFilter(state, filteredByState, setFilteredByState)}
              className={[
                "cursor-pointer active:scale-95 h-[36px] min-w-10 flex-grow-1",
                STATE_COLORS[state],
                getRoundedClass(index),
                isActive ? "border-3 border-slate-50" : "",
              ].join(" ")}
            />
          </Popover>
        );
      })}
    </div>
  );
}
