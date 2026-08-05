"use client";

import { useEffect, useRef, useState } from "react";
import { INPUT_CLASS } from "@/constants";

type Category = { id: string; name: string; color: string | null };

interface Props {
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
}

export default function CategoryMultiFilter({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = categories.filter((c) => value.includes(c.id));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${INPUT_CLASS} flex items-center justify-between gap-2 cursor-pointer`}
      >
        {selected.length > 0 ? (
          <span className="truncate font-medium text-gray-700">
            {selected.length === 1 ? selected[0].name : `${selected.length} categorías`}
          </span>
        ) : (
          <span className="text-gray-400">Todas las categorías</span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
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
            onClick={() => onChange([])}
            className={`w-full text-left px-4 py-2 text-sm transition hover:bg-gray-50 ${value.length === 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}
          >
            Todas las categorías
          </button>
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(cat.id)}
                onChange={() => toggle(cat.id)}
                className="flex-shrink-0"
              />
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: cat.color ?? "#374151" }}
              />
              <span
                className={`font-medium ${value.includes(cat.id) ? "font-semibold" : ""}`}
                style={{ color: cat.color ?? "#374151" }}
              >
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
