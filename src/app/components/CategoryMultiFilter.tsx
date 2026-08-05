"use client";

import { useEffect, useRef, useState } from "react";
import { INPUT_CLASS } from "@/constants";

type Category = { id: string; name: string; color: string | null };

interface Props {
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
}

const NAV_KEYS = ["ArrowDown", "ArrowUp", " ", "Enter"];

export default function CategoryMultiFilter({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const selected = categories.filter((c) => value.includes(c.id));
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search, open]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function close() {
    setOpen(false);
    setSearch("");
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function handleButtonKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (NAV_KEYS.includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const active = filtered[activeIndex];
      if (active) toggle(active.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleButtonKeyDown}
        className={`${INPUT_CLASS} flex items-center justify-between gap-2 cursor-pointer`}
      >
        {selected.length > 0 ? (
          <span className="truncate font-medium text-gray-700">
            {selected.length === 1 ? selected[0].name : `${selected.length} categorías`}
          </span>
        ) : (
          <span className="text-gray-400">Todas las categorías</span>
        )}
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              title="Quitar selección"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
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
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          <div className="px-2 pb-1.5 pt-0.5">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar categoría..."
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className={`w-full text-left px-4 py-2 text-sm transition hover:bg-gray-50 ${value.length === 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}
            >
              Todas las categorías
            </button>
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>
            )}
            {filtered.map((cat, i) => (
              <label
                key={cat.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer transition ${
                  i === activeIndex ? "bg-cyan-50" : "hover:bg-gray-50"
                }`}
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
        </div>
      )}
    </div>
  );
}
