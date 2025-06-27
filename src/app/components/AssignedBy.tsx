import { AssignedByType } from "@/types/dicomType";
import Image from "next/image";
import { useState } from "react";
import { Popover } from "react-tiny-popover";

export default function AssignedBy({ assignedBy }: { assignedBy: AssignedByType }) {
  const { image_url, first_name, last_name, id, role } = assignedBy;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <>
      <Popover
        isOpen={isPopoverOpen}
        onClickOutside={() => setIsPopoverOpen(false)}
        positions={["top", "bottom", "left", "right"]}
        padding={12}
        content={
          <div className="w-50 py-5 px-4 rounded-lg bg-white shadow-sm">
            <div className="text-xs mb-4 text-center text-gray-500">
              Assigned to me <br />by
            </div>
            <Image
              src={image_url}
              className="rounded-full mb-3 mx-auto bg-gray-100"
              alt={first_name || id}
              width={44}
              height={44}
              title={first_name}
            />
            <div
              className="font-semibold w-full text-center truncate"
              title={first_name}
            >
              {first_name} {last_name}
            </div>
            <div className="text-sm text-center text-gray-500">
              {role?.name}
            </div>
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          className={`${isPopoverOpen ? "text-cyan-400 bg-cyan-50 border-cyan-200" : "border-gray-200 bg-gray-100"} flex p-1.5 outline-0 cursor-pointer border hover:border-cyan-200 rounded-lg hover:bg-cyan-50 hover:text-cyan-400 transition-colors`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="1.5"
              d="M7 14h10M7 11h10M7 17h6m3-14v2.2a.8.8 0 0 1-.8.8H8.8a.8.8 0 0 1-.8-.8V3m2 0a2 2 0 1 1 4 0M5.4 3h13.2A2.4 2.4 0 0 1 21 5.4v15.2a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 20.6V5.4A2.4 2.4 0 0 1 5.4 3"
            />
          </svg>
        </button>
      </Popover>
    </>
  );
}
