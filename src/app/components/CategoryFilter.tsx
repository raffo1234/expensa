"use client";

import { useEffect, useRef, useState } from "react";
import { INPUT_CLASS } from "@/constants";

type Category = { id: string; name: string; color: string | null };

interface Props {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}

export default function CategoryFilter({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = categories.find((c) => c.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${INPUT_CLASS} flex items-center justify-between gap-2 cursor-pointer`}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: selected.color ?? "#374151" }}
            />
            <span className="font-medium" style={{ color: selected.color ?? "#374151" }}>
              {selected.name}
            </span>
          </span>
        ) : (
          <span className="text-gray-400">Todas las categorías</span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-sm transition hover:bg-gray-50 ${!value ? "font-semibold text-gray-900" : "text-gray-500"}`}
          >
            Todas las categorías
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onChange(cat.id);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 transition"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: cat.color ?? "#374151" }}
              />
              <span
                className={`font-medium ${value === cat.id ? "font-semibold" : ""}`}
                style={{ color: cat.color ?? "#374151" }}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
