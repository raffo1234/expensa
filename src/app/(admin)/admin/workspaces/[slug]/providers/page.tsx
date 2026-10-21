"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useParams } from "next/navigation";
import { getWorkspaceBySlug } from "@/actions/lookups";
import {
  createProvider,
  deleteProvider,
  listProviders,
  updateProvider,
  type ProviderRecord,
} from "@/actions/providers";
import Link from "next/link";
import FormSection from "@/components/FormSection";
import ListPage from "@/components/ListPage";
import PageNavigator from "@/components/PageNavigator";
import SearchInput from "@/components/SearchInput";
import ClearFiltersButton from "@/components/ClearFiltersButton";
import DataTable, { DataTableRow, Td, type DataTableColumn } from "@/components/DataTable";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  HEADER_LINK_CLASS,
  ICON_SIZE,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/constants";

const COLUMNS: DataTableColumn[] = [{ label: "Nombre" }, { label: "RUC" }, { label: "" }];

// ── Types ────────────────────────────────────────────────────────────────────
type Provider = ProviderRecord;

// ── Fetchers ──────────────────────────────────────────────────────────────────
const fetchWorkspace = (slug: string): Promise<{ id: string }> => getWorkspaceBySlug(slug);

const fetchProviders = (workspaceId: string): Promise<Provider[]> => listProviders(workspaceId);

// ── Constants ─────────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:border-violet-500 " +
  "focus:ring-2 focus:ring-violet-500/10 transition-all duration-150 shadow-sm";

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
          <h2 className="text-base font-book text-navy-900">
            {mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
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
              className={`${SECONDARY_BUTTON_CLASS} flex-1 justify-center`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${PRIMARY_BUTTON_CLASS} flex-1 justify-center`}
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
        <h2 className="text-base mb-1 font-book text-navy-900">Eliminar proveedor</h2>
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

  const q = search.trim().toLowerCase();
  const filtered = providers.filter((p) => p.name.toLowerCase().includes(q) || p.ruc.includes(q));
  const { rows, start, pager } = useClientPagination(filtered, q);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  async function handleCreate(data: { ruc: string; name: string }): Promise<string | null> {
    const { error } = await createProvider({
      workspace_id: workspaceId,
      ruc: data.ruc,
      name: data.name,
    });
    if (error) return error;
    mutate(swrKey);
    return null;
  }

  async function handleEdit(
    id: string,
    data: { ruc: string; name: string },
  ): Promise<string | null> {
    const { error } = await updateProvider(id, { ruc: data.ruc, name: data.name });
    if (error) return error;
    mutate(swrKey);
    return null;
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteProvider(id);
    mutate(swrKey);
  }

  const icon =
    "flex h-9 aspect-square items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";

  return (
    <>
      <FormSection
        title="Proveedores"
        backUrl={`/admin/workspaces/${workspaceSlug}/expenses`}
        actions={
          <Link href={`/admin/workspaces/${workspaceSlug}/materials`} className={HEADER_LINK_CLASS}>
            Materiales
          </Link>
        }
      >
        <ListPage
          pager={<PageNavigator {...pager} />}
          controls={
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {search ? "Proveedores encontrados" : "Proveedores"}
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
                    {filtered.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ type: "create" })}
                  disabled={!workspaceId}
                  className={`${PRIMARY_BUTTON_CLASS} justify-center min-h-11`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12h14M12 5v14" />
                  </svg>
                  Nuevo proveedor
                </button>
              </div>

              <div className="flex items-center gap-2">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar por nombre o RUC…"
                  className="flex-1"
                />
                <ClearFiltersButton onClick={() => setSearch("")} disabled={!search} />
              </div>
            </>
          }
        >
          <DataTable
            columns={COLUMNS}
            numbered
            isLoading={isLoading}
            isEmpty={filtered.length === 0}
            emptyMessage={
              providers.length === 0
                ? "Sin proveedores aún. Crea el primero para asignarlo a tus gastos."
                : `No se encontraron proveedores para "${search}".`
            }
          >
            {rows.map((provider, i) => (
              <DataTableRow key={provider.id} number={start + i + 1}>
                <Td className="font-book text-navy-900">
                  <span className="block max-w-96 truncate">{provider.name}</span>
                </Td>
                <Td className="font-mono">{provider.ruc}</Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit", provider })}
                      aria-label={`Editar ${provider.name}`}
                      title="Editar"
                      className={`${icon} hover:bg-violet-50 hover:text-violet-700`}
                    >
                      <svg
                        width={ICON_SIZE}
                        height={ICON_SIZE}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ type: "delete", provider })}
                      aria-label={`Eliminar ${provider.name}`}
                      title="Eliminar"
                      className={`${icon} hover:bg-red-50 hover:text-red-600`}
                    >
                      <svg
                        width={ICON_SIZE}
                        height={ICON_SIZE}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </Td>
              </DataTableRow>
            ))}
          </DataTable>
        </ListPage>
      </FormSection>

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
    </>
  );
}
