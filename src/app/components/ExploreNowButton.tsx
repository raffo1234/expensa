"use client";

import { ICON_SIZE } from "@/constants";
import roleFetcher from "@/fetchers/roleFetcher";
import Link from "next/link";
import { preload } from "swr";

export default function ExploreNowButton({
  userRoleId,
}: {
  userRoleId?: string;
}) {
  const onMouseEnter = () =>
    preload("currentUserRole", () =>
      userRoleId ? roleFetcher(userRoleId) : null
    );

  return (
    <Link
      onMouseEnter={onMouseEnter}
      href="/admin/dicom"
      title="Explore Now"
      style={{ fontFamily: "poppins" }}
      className="text-lg flex items-center gap-4 px-8 py-3 bg-black text-white rounded-full transition-colors duration-700 hover:bg-gray-800 active:bg-gray-900"
    >
      <span>Explore Now</span>
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
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M4 12h16m0 0l-6-6m6 6l-6 6"
        />
      </svg>
    </Link>
  );
}
