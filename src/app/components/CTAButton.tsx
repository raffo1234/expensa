"use client";
import { useRouter } from "next/navigation";
import { CTA_PRIMARY_CLASS } from "@/constants";

export default function CTAButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(isLoggedIn ? "/admin/workspaces" : "/session/new")}
      className={CTA_PRIMARY_CLASS}
    >
      Upload free <span>→</span>
    </button>
  );
}
