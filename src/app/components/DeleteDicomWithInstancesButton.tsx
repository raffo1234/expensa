"use client";

import { ICON_SIZE } from "@/constants";
import { deleteFullStudyAction } from "@/lib/deleteFullStudyAction";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useTransition } from "react";
import toast from "react-hot-toast";

export function DeleteDicomWithInstancesButton({
  dicomId,
  studyUID,
  mutate
}: {
  dicomId: string;
  studyUID: string;
  mutate: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("¿Eliminar este estudio y todos sus archivos en R2?")) return;

    startTransition(async () => {
      const result = await deleteFullStudyAction(studyUID, dicomId);
      if (result?.success) {
        toast.success(`Eliminado: ${result.count} archivos borrados.`);
        mutate();
      } else {
        toast.error(`Error: ${result?.error}`);
      }
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      title="Delete Studio with all its files in R2"
      className="aspect-square p-2 hover:bg-white flex-shrink-0 transition-colors duration-300 cursor-pointer bg-gray-100 rounded-full border-gray-200 border-dashed border text-rose-400 flex items-center justify-center"
    >
      {isPending ? (
        <Icon icon="solar:record-broken" className="animate-spin" fontSize={24} />
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
  );
}
