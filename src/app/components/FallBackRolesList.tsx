import { ICON_SIZE } from "@/constants";

export default function FallBackRolesList() {
  return Array.from({ length: 3 }, (_, i) => (
    <div
      key={i}
      className="px-6 h-[52px] flex gap-3.5 items-center py-4 border-t w-full first:border-t-0 border-slate-200"
    >
      <svg
        className="animate-pulse"
        xmlns="http://www.w3.org/2000/svg"
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="m19 9l-7 6l-7-6"
        />
      </svg>
      <div className="rounded-lg bg-slate-100 animate-pulse h-5 w-1/2" />
    </div>
  ));
}
