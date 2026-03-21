"use client";

import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import CircularSecondaryButton from "./CircularSecondaryButton";

export default function ClearButton({ clearLocalStorage }: { clearLocalStorage: () => void }) {
  const title = "Clear all filters";

  return (
    <CircularSecondaryButton onClick={clearLocalStorage} title={title}>
      <Icon icon="pajamas:clear-all" fontSize={ICON_SIZE}></Icon>
    </CircularSecondaryButton>
  );
}
