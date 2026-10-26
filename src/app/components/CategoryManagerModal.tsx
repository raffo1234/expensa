"use client";

import SubmitButton from "./SubmitButton";
import { useState } from "react";
import { useGlobalState } from "@/lib/globalState";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/constants";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  setCategoryRequiresGuide,
} from "@/actions/categories";
import toast from "react-hot-toast";
import { useInvalidateExpenseLists } from "@/hooks/useInvalidateExpenseLists";
import Field from "./Field";

type Category = {
  id: string;
  name: string;
  color: string | null;
  /** Expenses in it need a guía de remisión (default true). */
  requires_guide?: boolean | null;
};

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

export default function CategoryManagerModal({
  workspaceId,
  categories: initial,
  onUpdate,
  canManageGuideRules = false,
}: {
  workspaceId: string;
  categories: Category[];
  onUpdate: (categories: Category[]) => void;
  /** Can switch a category's guía de remisión rule (EXEMPT_GUIDE). */
  canManageGuideRules?: boolean;
}) {
  const { setModalOpen } = useGlobalState();
  const invalidateLists = useInvalidateExpenseLists();
  const [categories, setCategories] = useState<Category[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", color: COLORS[0] });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEditing = editingId !== null;

  // Optimistic: the switch moves at once and rolls back if saving fails.
  const toggleGuide = (cat: Category) => {
    const next = cat.requires_guide === false;
    const apply = (value: boolean) => {
      setCategories((list) => {
        const updated = list.map((c) => (c.id === cat.id ? { ...c, requires_guide: value } : c));
        onUpdate(updated);
        return updated;
      });
    };
    apply(next);
    setCategoryRequiresGuide(cat.id, next).then(({ error }) => {
      if (error) {
        apply(!next);
        toast.error("No se pudo guardar. Se restauró el valor anterior.");
      } else {
        invalidateLists(); // the documents status of its expenses changes
        toast.success(
          next ? `«${cat.name}» requiere guía de remisión` : `«${cat.name}» ya no requiere guía`,
        );
      }
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", color: COLORS[0] });
    setError(null);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, color: cat.color || COLORS[0] });
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      if (isEditing) {
        const result = await updateCategory(editingId, { name: form.name, color: form.color });
        if (result.error) {
          setError(result.error);
          return;
        }
        const updated = categories.map((c) =>
          c.id === editingId ? { ...c, name: form.name.trim(), color: form.color } : c,
        );
        setCategories(updated);
        onUpdate(updated);
      } else {
        const result = await createCategory({
          workspace_id: workspaceId,
          name: form.name,
          color: form.color,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        const updated = [...categories, result.category!].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setCategories(updated);
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
      const result = await deleteCategory(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      onUpdate(updated);
      if (editingId === id) resetForm();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 p-1">
      <h2 className="text-base font-book text-navy-900">Categorias</h2>

      {categories.length > 0 ? (
        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 group hover:border-gray-200 transition"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || "#6b7280" }}
              />
              <span className="flex-1 text-sm text-gray-700 truncate">{cat.name}</span>
              {canManageGuideRules ? (
                <label className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 text-xs text-navy-500">
                  <input
                    type="checkbox"
                    checked={cat.requires_guide !== false}
                    onChange={() => toggleGuide(cat)}
                    className="size-4 cursor-pointer accent-violet-600"
                  />
                  Requiere guía
                </label>
              ) : (
                cat.requires_guide === false && (
                  <span className="flex-shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-500">
                    Sin guía
                  </span>
                )
              )}
              <button
                type="button"
                onClick={() => startEdit(cat)}
                className="text-xs text-gray-400 hover:text-violet-600 opacity-0 group-hover:opacity-100 transition"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
              >
                {deletingId === cat.id ? "..." : "Eliminar"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">No hay categorias.</p>
      )}

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-medium text-gray-500">
          {isEditing ? "Editar categoria" : "Nueva categoria"}
        </p>
        <Field label="Nombre *">
          <input
            type="text"
            placeholder="Ej: Materiales"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  form.color === c
                    ? "border-gray-800 scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
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
          <SubmitButton type="button" onClick={handleSave} pending={isPending}>
            {isEditing ? "Actualizar" : "Agregar"}
          </SubmitButton>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setModalOpen(false)}
          className={SECONDARY_BUTTON_CLASS}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
