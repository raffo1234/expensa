"use client";

import UploadLink from "./UploadLink";
import { Icon } from "@iconify/react/dist/iconify.js";

export default function NoData() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 select-none">
      <div className="relative mb-8">
        <Icon icon="solar:hand-heart-linear" fontSize={60}></Icon>

        <span className="absolute -top-1 -right-1 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-50" />
          <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-400" />
        </span>
      </div>

      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-rose-400 mb-3">No data</p>

      <h1 className="text-2xl font-semibold text-slate-700 mb-2 text-center">
        You don&apos;t have any studies yet.
      </h1>

      <p className="text-sm text-slate-400 text-center max-w-xs mb-8">
        No results found. Try adjusting your filters or search terms or upload a new study.
      </p>

      <UploadLink />
    </div>
  );
}
