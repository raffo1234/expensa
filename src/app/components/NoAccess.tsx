"use client";

import { useRouter } from "next/navigation";

export default function NoAccess() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 select-none">
      <div className="relative mb-8">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-slate-300"
        >
          <rect x="20" y="44" width="56" height="40" rx="6" fill="currentColor" opacity="0.4" />
          <rect x="28" y="44" width="40" height="32" rx="4" fill="currentColor" opacity="0.3" />
          <path
            d="M32 44V30C32 19.5 64 19.5 64 30V44"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <circle cx="48" cy="62" r="5" fill="#94a3b8" />
          <rect x="46" y="62" width="4" height="7" rx="2" fill="#94a3b8" />
        </svg>

        <span className="absolute -top-1 -right-1 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-50" />
          <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-400" />
        </span>
      </div>

      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-rose-400 mb-3">
        Access Denied
      </p>

      <h1 className="text-2xl font-semibold text-slate-700 mb-2 text-center">
        You don&apos;t have permission to view this page
      </h1>

      <p className="text-sm text-slate-400 text-center max-w-xs mb-8">
        Contact your administrator if you believe this is a mistake.
      </p>

      <button
        onClick={() => router.back()}
        className="text-sm px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors duration-200 cursor-pointer"
      >
        Go back
      </button>
    </div>
  );
}
