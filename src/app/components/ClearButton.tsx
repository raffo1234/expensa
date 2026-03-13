"use client";

import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import InnerCircularButton from "./InnerCircularButton";

export default function ClearButton({ clearLocalStorage }: { clearLocalStorage: () => void }) {
  const title = "Clear all filters";

  return (
    <button
      onClick={clearLocalStorage}
      title={title}
    >
      <InnerCircularButton title={title}>
        <Icon icon="pajamas:clear-all" fontSize={ICON_SIZE}></Icon>
      </InnerCircularButton>
    </button>

  );
}
