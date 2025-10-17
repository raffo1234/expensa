import Link from "next/link";
import ProfilePopover from "@/components/ProfilePopover";
import LocaleSwitcher from "./LocaleSwitcher";

export default function Header() {
  return (
    <nav className="max-w-[1816px] w-full mx-auto p-4 justify-between flex items-center">
      <Link
        href="/"
        title="Cadia"
        className="flex items-center gap-2 text-sm font-semibold uppercase"
      >
        <span className="text-white p-2 rounded-xl bg-rose-400 block w-[46px] h-[46px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
              <path strokeLinejoin="round" d="m12 18l2-2.5h-4l2-2.5" />
              <path d="M7 9h10M3 13v-2c0-3.75 0-5.625.955-6.939A5 5 0 0 1 5.06 2.955C6.375 2 8.251 2 12 2s5.625 0 6.939.955a5 5 0 0 1 1.106 1.106C21 5.375 21 7.251 21 11v2c0 3.75 0 5.625-.955 6.939a5 5 0 0 1-1.106 1.106C17.625 22 15.749 22 12 22s-5.625 0-6.939-.955a5 5 0 0 1-1.106-1.106c-.531-.731-.767-1.635-.871-2.939" />
            </g>
          </svg>
        </span>
      </Link>
      <div className="flex gap-2 items-center">
        <LocaleSwitcher />
        <ProfilePopover />
      </div>
    </nav>
  );
}
