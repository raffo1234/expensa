"use client";

import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Popover } from "react-tiny-popover";
import { useState, useTransition, MouseEventHandler } from "react";
import { Icon } from "@iconify/react";
import { ICON_SIZE } from "@/constants";
import { PostgrestError } from "@supabase/supabase-js";

interface DeleteDuplicatedProps {
  dicomId: string;
  mutate: () => void;
}

export default function DeleteDuplicatedDicomButton({
  dicomId,
  mutate: globalMutate,
}: DeleteDuplicatedProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete: MouseEventHandler<HTMLButtonElement> = () => {
    const confirmDelete = confirm(
      "¿Estás seguro de eliminar este estudio duplicado? Esta acción es irreversible.",
    );
    if (!confirmDelete) return;

    startTransition(async () => {
      try {
        const { error }: { error: PostgrestError | null } = await supabase
          .from("dicom")
          .delete()
          .eq("id", dicomId)
          .eq("is_duplicated", true);

        if (error) throw error;

        await globalMutate();
        toast.success("Estudio duplicado eliminado.");
      } catch (e) {
        const error = e as PostgrestError;
        console.error("Error:", error.message);
        toast.error("No se pudo eliminar el registro.");
      }
    });
  };

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
          Delete copy
        </div>
      }
    >
      <button
        onMouseEnter={() => setIsPopoverOpen(true)}
        onMouseLeave={() => setIsPopoverOpen(false)}
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className={`aspect-square p-2 flex-shrink-0 transition-colors duration-300 cursor-pointer rounded-full border border-dashed flex items-center justify-center
          ${
            isPending
              ? "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed"
              : "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white"
          }`}
      >
        {isPending ? (
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
      </button>
    </Popover>
  );
}
