"use client";

import { ICON_SIZE } from "@/constants";
import roleFetcher from "@/fetchers/roleFetcher";
import Link from "next/link";
import { preload } from "swr";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ExploreNowButton({ userRoleId }: { userRoleId?: string }) {
  const t = useTranslations("HomePage");
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/admin/dicom");
    router.prefetch("/admin/dicoms");
    preload("currentUserRole", () => (userRoleId ? roleFetcher(userRoleId) : null));
  }, []);

  return (
    <Link
      href="/admin/dicom"
      title={t("button")}
      style={{ fontFamily: "poppins" }}
      className="text-lg flex group items-center gap-4 px-8 py-3 bg-black text-white rounded-full transition-colors duration-700 hover:bg-gray-800 active:bg-gray-900"
    >
      <span>{t("button")}</span>
      <svg
        className="group-hover:translate-x-2 transition-transform duration-500"
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
