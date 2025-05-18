import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";

export default function DateRangeButtonCalendar({ label }: { label: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <>
      <div
        className={`${isOpen ? "bg-gray-100  pr-9" : "pr-4 bg-cyan-400 text-white"} transition-all duration-300 w-fit font-semibold text-sm rounded-full mb-1 flex items-center relative`}
      >
        <button
          onClick={toggle}
          type="button"
          className="cursor-pointer px-4 py-2 rounded-full bg-cyan-400"
        >
          <Icon
            icon="solar:calendar-linear"
            fontSize={20}
            className="text-white"
          ></Icon>
        </button>
        <button
          onClick={toggle}
          type="button"
          className={`${isOpen ? "px-4" : ""} cursor-pointer h-full py-2`}
        >
          {isOpen ? "05 mayo 2025 - 28 julio 2025" : label}
        </button>
        {isOpen ? (
          <button
            type="button"
            onClick={toggle}
            className="cursor-pointer bg-cyan-400 p-1 rounded-full text-white right-0 absolute top-1/2 -translate-y-1/2"
          >
            <Icon
              icon="material-symbols-light:close-rounded"
              fontSize={28}
            ></Icon>
          </button>
        ) : null}
      </div>
    </>
  );
}
