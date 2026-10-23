"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/constants";

/**
 * Shown when the user's role lacks the permission a page needs. The main way
 * out is the home page; "Volver" is there for when they came from a link.
 */
export default function NoAccess() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] select-none flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-violet-200/70 bg-white text-violet-500 shadow-[0_1px_2px_rgb(91_33_182/0.08)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="10"
            width="16"
            height="11"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 10V7a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M12 14.5v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>

      <h1 className="mb-2 text-title font-book text-navy-900">No tienes acceso a esta página</h1>
      <p className="mb-8 max-w-sm text-sm text-navy-500">
        Tu rol no tiene permiso para ver esta sección. Si crees que es un error, pide acceso a un
        administrador.
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.back()}
          className={`${SECONDARY_BUTTON_CLASS} min-h-11 justify-center sm:min-h-0`}
        >
          Volver
        </button>
        <Link href="/" className={`${PRIMARY_BUTTON_CLASS} min-h-11 justify-center sm:min-h-0`}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
          </svg>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
