"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LanguageSwitchButton() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = (nextLocale: string) => {
    if (locale === nextLocale) return;

    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
      router.refresh();
    });
  };

  const languages = [
    { code: "es", label: "ES" },
    { code: "en", label: "EN" },
  ];

  return (
    <div className="inline-flex gap-1" role="group">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          disabled={isPending}
          className={`text-xs self-end font-semibold cursor-pointer px-2 border border-slate-100 rounded-full py-2 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 ${
            locale === code
              ? "bg-black text-white pointer-events-none"
              : "hover:bg-slate-100 border-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
