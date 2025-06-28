"use client";

import { Icon } from "@iconify/react";
import deleteEntity from "@/lib/deleteEntity";
import { FileType } from "@/types/fileType";
import { useState } from "react";
import { ICON_SIZE } from "@/constants";

export default function DeleteFile({
  file,
  mutate,
}: {
  file: FileType;
  mutate: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEntity = () => {
    if ((file.id, file.path)) {
      deleteEntity(file.id, file.path, mutate, setIsDeleting);
    }
  };

  return (
    <button
      disabled={isDeleting}
      onClick={handleDeleteEntity}
      type="button"
      className="disabled:opacity-60 disabled:pointer-events-none border-dashed border hover:bg-white transition-colors duration-300 border-rose-400 w-11 mx-auto mt-3 cursor-pointer h-11 rounded-full  text-rose-400 flex items-center justify-center"
    >
      {isDeleting ? (
        <Icon
          icon="solar:record-broken"
          className="animate-spin"
          fontSize={ICON_SIZE}
        />
      ) : (
        <Icon icon="solar:trash-bin-minimalistic-broken" fontSize={ICON_SIZE} />
      )}
    </button>
  );
}
