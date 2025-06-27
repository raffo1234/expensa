import { UserType } from "@/types/userType";
import Image from "next/image";
import { useState } from "react";
import { Popover } from "react-tiny-popover";

export default function AssignedBy({ user }: { user: UserType }) {
  const { image_url, first_name, last_name, id, role } = user;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <>
      <Popover
        isOpen={isPopoverOpen}
        onClickOutside={() => setIsPopoverOpen(false)}
        positions={["top", "bottom", "left", "right"]}
        padding={12}
        content={
          <div className="max-w-50 p-4 rounded-lg bg-white shadow-sm">
            <Image
              src={image_url}
              className="rounded-full mb-3 mx-auto bg-gray-100"
              alt={first_name || id}
              width={44}
              height={44}
              title={first_name}
            />
            <div
              className="font-semibold w-full mb-1 text-center truncate"
              title={first_name}
            >
              {first_name} {last_name}
            </div>
            <div className="text-xs text-center text-gray-500">
              {role?.name}
            </div>
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          className={`${isPopoverOpen ? "text-cyan-400" : ""} flex p-1.5 outline-0 cursor-pointer border hover:border-cyan-200 border-gray-200 rounded-lg bg-gray-100 hover:bg-cyan-50 hover:text-cyan-400 transition-colors`}
        >
          By
        </button>
      </Popover>
    </>
  );
}
