import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";

export default function ClearButton({
  clearLocalStorage,
}: {
  clearLocalStorage: () => void;
}) {
  return (
    <button
      title="Clear All Filters"
      onClick={clearLocalStorage}
      className="cursor-pointer text-cyan-400 hover:text-cyan-600 transition-colors duration-300 p-2 border border-cyan-100 rounded-full"
    >
      <Icon icon="pajamas:clear-all" fontSize={ICON_SIZE}></Icon>
    </button>
  );
}
