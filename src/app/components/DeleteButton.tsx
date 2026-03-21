"use client";

import { Icon } from "@iconify/react";
import { ICON_SIZE } from "@/constants";
import PopoverInnerButton from "./PopoverInnerButton";

interface DeleteButtonProps {
  title?: string;
  isDeleting?: boolean;
  onClick: () => void;
}

export default function DeleteButton({
  title = "Delete",
  isDeleting = false,
  onClick,
}: DeleteButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      type="button"
      disabled={isDeleting}
      className="flex w-fit aspect-square cursor-pointer rounded-full bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-600 hover:border-rose-300 active:bg-rose-200 active:text-rose-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-200"
    >
      <PopoverInnerButton title={title}>
        {isDeleting ? (
          <Icon icon="solar:record-broken" className="animate-spin" fontSize={ICON_SIZE} />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
              d="M9.17 4a3.001 3.001 0 0 1 5.66 0m5.67 2h-17m14.874 9.4c-.177 2.654-.266 3.981-1.131 4.79s-2.195.81-4.856.81h-.774c-2.66 0-3.99 0-4.856-.81c-.865-.809-.953-2.136-1.13-4.79l-.46-6.9m13.666 0l-.2 3M9.5 11l.5 5m4.5-5l-.5 5"
            />
          </svg>
        )}
      </PopoverInnerButton>
    </button>
  );
}
