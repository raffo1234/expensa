import { Icon } from "@iconify/react/dist/iconify.js";

export default function GeneratePDFButton({
  label,
  isDisabled = false,
}: {
  label: string;
  isDisabled?: boolean;
}) {
  return (
    <button
      disabled={isDisabled}
      type="button"
      title="Download PDF"
      className="flex gap-1 items-center text-white cursor-pointer font-semibold disabled:opacity-90 py-2 px-6 text-xs bg-rose-400 hover:bg-rose-500 transition-colors duration-500 rounded-full"
    >
      <Icon icon="solar:download-minimalistic-bold" fontSize={24}></Icon>
      <span>{label}</span>
    </button>
  );
}
