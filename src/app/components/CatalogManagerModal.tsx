"use client";

import { useState } from "react";
import { useGlobalState } from "@/lib/globalState";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/constants";
import Field from "./Field";

type CatalogItem = { id: string; name: string };

export default function CatalogManagerModal({
  title,
  namePlaceholder,
  items: initial,
  onUpdate,
  create,
  update,
  remove,
}: {
  title: string;
  namePlaceholder?: string;
  items: CatalogItem[];
  onUpdate: (items: CatalogItem[]) => void;
  create: (name: string) => Promise<{ item?: CatalogItem; error?: string }>;
  update: (id: string, name: string) => Promise<{ error?: string }>;
  remove: (id: string) => Promise<{ error?: string }>;
}) {
  const { setModalOpen } = useGlobalState();
  const [items, setItems] = useState<CatalogItem[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setError(null);
  };

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setName(item.name);
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      if (isEditing) {
        const result = await update(editingId, name);
        if (result.error) { setError(result.error); return; }
        const updated = items.map((i) =>
          i.id === editingId ? { ...i, name: name.trim() } : i,
        );
        setItems(updated);
        onUpdate(updated);
      } else {
        const result = await create(name);
        if (result.error) { setError(result.error); return; }
        const updated = [...items.filter((i) => i.id !== result.item!.id), result.item!].sort(
          (a, b) => a.name.localeCompare(b.name),
        );
        setItems(updated);
        onUpdate(updated);
      }
      resetForm();
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await remove(id);
      if (result.error) { setError(result.error); return; }
      const updated = items.filter((i) => i.id !== id);
      setItems(updated);
      onUpdate(updated);
      if (editingId === id) resetForm();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 p-1">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>

      {items.length > 0 ? (
        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 group hover:border-gray-200 transition"
            >
              <span className="flex-1 text-sm text-gray-700 truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="text-xs text-gray-400 hover:text-cyan-600 opacity-0 group-hover:opacity-100 transition"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
              >
                {deletingId === item.id ? "..." : "Eliminar"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">No hay elementos todavía.</p>
      )}

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-medium text-gray-500">
          {isEditing ? "Editar" : "Nuevo"}
        </p>
        <Field label="Nombre *">
          <input
            type="text"
            placeholder={namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          {isEditing && (
            <button type="button" onClick={resetForm} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Agregar"}
          </button>
        </div>
      </div>

      <div className="pt-2">
        <button type="button" onClick={() => setModalOpen(false)} className={SECONDARY_BUTTON_CLASS}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
