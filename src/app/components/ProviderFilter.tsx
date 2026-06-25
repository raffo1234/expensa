"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Provider = { id: string; name: string };

interface Props {
  providers: Provider[];
  value: string;
  onChange: (id: string) => void;
}

export default function ProviderFilter({ providers, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = providers.find((p) => p.id === value);

  const filtered = providers.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  // "Todos" counts as index 0, providers start at 1
  const itemCount = filtered.length + 1;

  const select = useCallback(
    (index: number) => {
      onChange(index === 0 ? "" : filtered[index - 1]?.id ?? "");
      setOpen(false);
    },
    [filtered, onChange],
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setHighlighted(-1);
    } else {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    setHighlighted(-1);
  }, [search]);

  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    const el = listRef.current.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1 >= itemCount ? 0 : h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? itemCount - 1 : h - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      select(highlighted);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
      >
        {selected ? (
          <span className="font-medium text-gray-700 truncate">{selected.name}</span>
        ) : (
          <span className="text-gray-400">Todos los proveedores</span>
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
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar proveedor..."
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
            />
          </div>
          <div ref={listRef} className="overflow-y-auto">
            <button
              type="button"
              onClick={() => select(0)}
              className={`w-full text-left px-4 py-2 text-sm transition ${
                highlighted === 0 ? "bg-purple-50" : "hover:bg-gray-50"
              } ${!value ? "font-semibold text-gray-900" : "text-gray-500"}`}
            >
              Todos los proveedores
            </button>
            {filtered.map((provider, i) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => select(i + 1)}
                className={`w-full text-left px-4 py-2 text-sm transition ${
                  highlighted === i + 1 ? "bg-purple-50" : "hover:bg-gray-50"
                } ${value === provider.id ? "font-semibold text-gray-900" : "text-gray-600"}`}
              >
                {provider.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-2 text-sm text-gray-400">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
