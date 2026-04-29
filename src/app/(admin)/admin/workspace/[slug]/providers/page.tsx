"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────
type Provider = {
  id: string;
  workspace_id: string;
  ruc: string;
  name: string;
  created_at: string;
  updated_at: string;
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchWorkspace(slug: string): Promise<{ id: string }> {
  const { data, error } = await supabase.from("workspace").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data;
}

async function fetchProviders(workspaceId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("provider")
    .select("id, workspace_id, ruc, name, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:border-cyan-500 " +
  "focus:ring-2 focus:ring-cyan-500/10 transition-all duration-150 shadow-sm";

const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

// ── Modal ─────────────────────────────────────────────────────────────────────
function ProviderModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: { id: string; ruc: string; name: string };
  onClose: () => void;
  onSave: (data: { ruc: string; name: string }) => Promise<string | null>;
}) {
  const [ruc, setRuc] = useState(initial?.ruc ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedRuc = ruc.trim();
    const trimmedName = name.trim();

    if (!trimmedRuc) {
      setError("El RUC es obligatorio.");
      return;
    }
    if (!/^\d{11}$/.test(trimmedRuc)) {
      setError("El RUC debe tener exactamente 11 dígitos.");
      return;
    }
    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    setSaving(true);
    const err = await onSave({ ruc: trimmedRuc, name: trimmedName });
    setSaving(false);

    if (err) {
      // Supabase unique constraint violation code
      if (
        err.includes("provider_workspace_id_ruc_unique") ||
        err.toLowerCase().includes("unique")
      ) {
        setError("Ya existe un proveedor con ese RUC en este workspace.");
      } else {
        setError(err);
      }
    } else {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Modal header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input
              ref={nameRef}
              type="text"
              placeholder="Ej: Distribuidora San Martín S.A.C."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>RUC *</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej: 20512345678"
              maxLength={11}
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))}
              className={`${inputCls} font-mono tracking-widest`}
            />
            <p className="text-xs text-gray-400 mt-1.5">11 dígitos, único por workspace.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 border border-red-200 bg-red-50 rounded-lg px-3.5 py-2.5 text-sm text-red-600">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0 mt-0.5"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium
                         text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                         text-sm font-semibold text-white transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                boxShadow: "0 2px 10px rgba(6,182,212,0.3)",
              }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.25"
                    />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Guardando...
                </>
              ) : mode === "create" ? (
                "Crear proveedor"
              ) : (
                "Guardar cambios"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────
function DeleteDialog({
  provider,
  onClose,
  onConfirm,
}: {
  provider: Provider;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    onClose();
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Eliminar proveedor</h2>
        <p className="text-sm text-gray-500 mb-1">
          ¿Estás seguro de que quieres eliminar{" "}
          <span className="font-semibold text-gray-800">{provider.name}</span>?
        </p>
        <p className="text-xs text-gray-400 mb-5">
          RUC {provider.ruc} · Los gastos asociados perderán la referencia al proveedor.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium
                       text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                       text-sm font-semibold text-white bg-red-500 hover:bg-red-600
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {deleting ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Eliminando...
              </>
            ) : (
              "Eliminar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProvidersPage() {
  const params = useParams();
  const workspaceSlug = params.slug as string;
  const router = useRouter();

  const { data: workspace } = useSWR(
    workspaceSlug ? ["workspace", workspaceSlug] : null,
    ([, slug]) => fetchWorkspace(slug),
  );
  const workspaceId = workspace?.id ?? "";

  const swrKey = workspaceId ? ["providers", workspaceId] : null;
  const { data: providers = [], isLoading } = useSWR(swrKey, ([, wid]) => fetchProviders(wid));

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "edit"; provider: Provider }
    | { type: "delete"; provider: Provider }
    | null
  >(null);

  const filtered = providers.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.ruc.includes(search),
  );

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  async function handleCreate(data: { ruc: string; name: string }): Promise<string | null> {
    const { error } = await supabase.from("provider").insert({
      workspace_id: workspaceId,
      ruc: data.ruc,
      name: data.name,
    });
    if (error) return error.message;
    mutate(swrKey);
    return null;
  }

  async function handleEdit(
    id: string,
    data: { ruc: string; name: string },
  ): Promise<string | null> {
    const { error } = await supabase
      .from("provider")
      .update({ ruc: data.ruc, name: data.name })
      .eq("id", id);
    if (error) return error.message;
    mutate(swrKey);
    return null;
  }

  async function handleDelete(id: string): Promise<void> {
    await supabase.from("provider").delete().eq("id", id);
    mutate(swrKey);
  }

  return (
    <div className="min-h-screen text-gray-900">
      {/* Nav */}
      <nav className=" top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => router.push(`/admin/workspace/${workspaceSlug}`)}
              className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50"
            >
              Workspace
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium px-2 py-1">Proveedores</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Proveedores</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona los proveedores asociados a tus gastos.
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            disabled={!workspaceId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                       text-white transition-all active:scale-[0.98] disabled:opacity-40 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
              boxShadow: "0 2px 12px rgba(6,182,212,0.35)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo proveedor
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-32 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeOpacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Cargando proveedores...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && providers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Sin proveedores aún</p>
            <p className="text-xs text-gray-400 mb-5">
              Crea tu primer proveedor para asignarlo a gastos.
            </p>
            <button
              onClick={() => setModal({ type: "create" })}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" }}
            >
              Crear proveedor
            </button>
          </div>
        )}

        {/* No search results */}
        {!isLoading && providers.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">
            No se encontraron proveedores para{" "}
            <span className="font-medium text-gray-600">{search}</span>.
          </div>
        )}

        {/* Table */}
        {!isLoading && filtered.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_140px_80px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Nombre
              </span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                RUC
              </span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">
                Acciones
              </span>
            </div>

            {/* Rows */}
            {filtered.map((provider, i) => (
              <div
                key={provider.id}
                className={`grid grid-cols-[1fr_140px_80px] gap-4 items-center px-5 py-3.5
                  ${i < filtered.length - 1 ? "border-b border-gray-100" : ""}
                  hover:bg-gray-50/60 transition-colors group`}
              >
                {/* Name */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{provider.name}</p>
                </div>

                {/* RUC */}
                <div>
                  <span className="font-mono text-sm text-gray-500 tracking-wider">
                    {provider.ruc}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setModal({ type: "edit", provider })}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-cyan-500 hover:bg-cyan-50
                               transition-all opacity-0 group-hover:opacity-100"
                    title="Editar"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setModal({ type: "delete", provider })}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50
                               transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40">
              <p className="text-xs text-gray-400">
                {filtered.length === providers.length
                  ? `${providers.length} proveedor${providers.length !== 1 ? "es" : ""}`
                  : `${filtered.length} de ${providers.length} proveedores`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "create" && (
        <ProviderModal mode="create" onClose={() => setModal(null)} onSave={handleCreate} />
      )}

      {modal?.type === "edit" && (
        <ProviderModal
          mode="edit"
          initial={modal.provider}
          onClose={() => setModal(null)}
          onSave={(data) => handleEdit(modal.provider.id, data)}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteDialog
          provider={modal.provider}
          onClose={() => setModal(null)}
          onConfirm={() => handleDelete(modal.provider.id)}
        />
      )}
    </div>
  );
}
