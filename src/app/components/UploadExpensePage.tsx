"use client";

import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createExpense } from "@/actions/expenses";
import FormSection from "./FormSection";
import FormInnerSection from "./FormInnerSection";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/constants";
import SectionTitle from "./SectionTitle";
import BackLink from "./BackLink";
import TitleWrapper from "./TitleWrapper";
import Field from "./Field";

// ── Types ────────────────────────────────────────────────────────────────────
type Category = { id: string; name: string; color: string | null };
type Provider = { id: string; name: string; ruc: string }; // ← added ruc
type FileItem = { id: string; file: File; preview?: string };

// ── SWR fetchers ─────────────────────────────────────────────────────────────
async function fetchWorkspace(slug: string): Promise<{ id: string }> {
  const { data, error } = await supabase.from("workspace").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data;
}

async function fetchCategories(workspaceId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("category")
    .select("id, name, color")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

async function fetchProviders(workspaceId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("provider")
    .select("id, name, ruc") // ← added ruc
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENCIES = ["PEN", "USD", "EUR"];
const PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta débito",
  "Tarjeta crédito",
  "Transferencia",
  "Yape / Plin",
  "Otro",
];

// ── Receipt extractor ─────────────────────────────────────────────────────────
async function extractFromReceipt(file: File): Promise<Record<string, string>> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch("/api/extract-expense", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType: file.type }),
  });

  if (!res.ok) throw new Error("Extraction failed");
  return res.json();
}

// ── Component ────────────────────────────────────────────────────────────────
export default function UploadExpensePage({ userId }: { userId: string }) {
  const params = useParams();
  const workspaceSlug = params.slug as string;
  const router = useRouter();
  const dropRef = useRef<HTMLLabelElement>(null);

  const { data: workspace } = useSWR(
    workspaceSlug ? ["workspace", workspaceSlug] : null,
    ([, slug]) => fetchWorkspace(slug),
  );
  const workspaceId = workspace?.id ?? "";

  const { data: categories = [], isLoading: catsLoading } = useSWR(
    workspaceId ? ["categories", workspaceId] : null,
    ([, wid]) => fetchCategories(wid),
  );

  const { data: providers = [], isLoading: providersLoading } = useSWR(
    workspaceId ? ["providers", workspaceId] : null,
    ([, wid]) => fetchProviders(wid),
  );

  const [form, setForm] = useState({
    provider_id: "", // controls the <select> UI only
    invoice_series: "",
    invoice_number: "",
    amount: "",
    currency: "PEN",
    issued_at: "",
    paid_at: new Date().toISOString().slice(0, 10),
    payment_method: "",
    category_id: "",
    notes: "",
  });

  // Resolved provider data sent to the server action (ruc + name)
  // This is what createExpense uses to find-or-create the provider
  const [resolvedProvider, setResolvedProvider] = useState<{
    ruc: string | null;
    name: string | null;
  }>({ ruc: null, name: null });

  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Whether the extracted provider wasn't found in the list (will be auto-created)
  const willCreateProvider = resolvedProvider.ruc !== null && !form.provider_id;

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // When the user manually picks a provider from the dropdown
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setForm((f) => ({ ...f, provider_id: id }));

    if (id) {
      const provider = providers.find((p) => p.id === id);
      setResolvedProvider({ ruc: provider?.ruc ?? null, name: provider?.name ?? null });
    } else {
      setResolvedProvider({ ruc: null, name: null });
    }
  };

  const addFiles = useCallback(
    async (incoming: File[]) => {
      const allowed = incoming.filter((f) =>
        ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type),
      );
      if (!allowed.length) return;

      setFiles((prev) => [
        ...prev,
        ...allowed.map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        })),
      ]);

      setExtracting(true);
      setResolvedProvider({ ruc: null, name: null });

      try {
        const extracted = await extractFromReceipt(allowed[0]);

        setForm((f) => ({
          ...f,
          ...(extracted.amount ? { amount: String(extracted.amount) } : {}),
          ...(extracted.currency && CURRENCIES.includes(extracted.currency)
            ? { currency: extracted.currency }
            : {}),
          ...(extracted.paid_at ? { paid_at: extracted.paid_at } : {}),
          ...(extracted.issued_at ? { issued_at: extracted.issued_at } : {}),
          ...(extracted.invoice_series ? { invoice_series: extracted.invoice_series } : {}),
          ...(extracted.invoice_number ? { invoice_number: extracted.invoice_number } : {}),
          ...(extracted.notes ? { notes: extracted.notes } : {}),
          ...(extracted.payment_method && PAYMENT_METHODS.includes(extracted.payment_method)
            ? { payment_method: extracted.payment_method }
            : {}),
        }));

        // Resolve provider: try to match existing, otherwise queue for auto-creation
        if (extracted.provider_ruc || extracted.provider_name) {
          const match = providers.find(
            (p) =>
              (extracted.provider_ruc && p.ruc === extracted.provider_ruc) ||
              (extracted.provider_name &&
                p.name.toLowerCase().includes(extracted.provider_name.toLowerCase())),
          );

          if (match) {
            // Already exists — pre-select it in the dropdown
            setForm((f) => ({ ...f, provider_id: match.id }));
            setResolvedProvider({ ruc: match.ruc, name: match.name });
          } else {
            // Doesn't exist — will be auto-created on submit
            setForm((f) => ({ ...f, provider_id: "" }));
            setResolvedProvider({
              ruc: extracted.provider_ruc ?? null,
              name: extracted.provider_name ?? null,
            });
          }
        }
      } catch {
        // silently fail — user fills manually
      } finally {
        setExtracting(false);
      }
    },
    [providers],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles],
  );

  const removeFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.preview) URL.revokeObjectURL(file.preview);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workspaceId) {
      setError("No se pudo obtener el workspace.");
      return;
    }
    if (!userId) {
      setError("No se pudo obtener el usuario.");
      return;
    }

    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }

    setIsPending(true);
    try {
      const serializedFiles = await Promise.all(
        files.map(async (fi) => {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(fi.file);
          });
          return {
            name: fi.file.name,
            type: fi.file.type,
            buffer: Array.from(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))),
          };
        }),
      );

      const result = await createExpense({
        workspace_id: workspaceId,
        workspace_slug: workspaceSlug,
        created_by: userId,
        category_id: form.category_id || undefined,
        provider_ruc: resolvedProvider.ruc,
        provider_name: resolvedProvider.name,
        invoice_series: form.invoice_series || undefined,
        invoice_number: form.invoice_number || undefined,
        amount: amountCents,
        currency: form.currency,
        issued_at: form.issued_at || undefined,
        paid_at: form.paid_at,
        payment_method: form.payment_method || undefined,
        notes: form.notes || undefined,
        files: serializedFiles,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => router.push(`/admin/workspaces/${workspaceSlug}/expenses`), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsPending(false);
    }
  };

  const currSymbol = form.currency === "PEN" ? "S/" : form.currency === "USD" ? "$" : "€";

  return (
    <div>
      <BackLink href={`/admin/workspaces/${workspaceSlug}/expenses`}>Volver</BackLink>
      <TitleWrapper>
        <div className="flex items-center gap-3">
          <SectionTitle>
            Gastos <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium px-2 py-1">Nuevo</span>
          </SectionTitle>
        </div>
      </TitleWrapper>
      <FormSection>
        <div className="mb-8">
          <SectionTitle>Nuevo gasto</SectionTitle>
          <p className="text-sm text-gray-500 mt-1">
            Sube un comprobante y los campos se rellenan solos.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <SectionTitle>Comprobante / Adjuntos</SectionTitle>
          <FormInnerSection>
            <section className="space-y-4">
              <div className="text-xs text-gray-500 mb-2">Se rellena automáticamente ✦</div>
              <label
                ref={dropRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed
                rounded-xl py-9 cursor-pointer transition-all duration-200
                ${
                  dragging
                    ? "border-purple-600 bg-cyan-50"
                    : "border-gray-200 hover:border-purple-400 hover:bg-purple-50/40"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                />
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                ${dragging ? "bg-cyan-100" : "bg-gray-100"}`}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={dragging ? "text-cyan-500" : "text-gray-400"}
                    stroke="currentColor"
                  >
                    <path
                      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="17 8 12 3 7 8"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line x1="12" y1="3" x2="12" y2="15" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Arrastra archivos o{" "}
                    <span className="text-cyan-600 underline underline-offset-2">haz click</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    JPG, PNG, WEBP, PDF — máx 10 MB c/u
                  </p>
                </div>
              </label>

              {/* Extracting indicator */}
              {extracting && (
                <div className="flex items-center gap-2.5 bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-3">
                  <svg
                    className="animate-spin w-4 h-4 text-cyan-500 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
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
                  <div>
                    <p className="text-xs font-semibold text-cyan-700">Analizando comprobante...</p>
                    <p className="text-[11px] text-cyan-500">
                      Extrayendo monto, fechas y proveedor
                    </p>
                  </div>
                </div>
              )}

              {/* New provider — will be auto-created */}
              {!extracting && willCreateProvider && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-emerald-500 flex-shrink-0"
                  >
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="text-xs text-emerald-700">
                    Nuevo proveedor detectado:{" "}
                    <span className="font-semibold">{resolvedProvider.name}</span>
                    {resolvedProvider.ruc && (
                      <span className="text-emerald-500"> · RUC {resolvedProvider.ruc}</span>
                    )}{" "}
                    — se creará automáticamente al guardar.
                  </p>
                </div>
              )}

              {/* Success extraction hint */}
              {!extracting && files.length > 0 && !willCreateProvider && form.provider_id && (
                <div className="flex items-center gap-2 text-xs text-cyan-600">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Campos rellenados desde el comprobante
                </div>
              )}

              {files.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {files.map((fi) => (
                    <li
                      key={fi.id}
                      className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 group"
                    >
                      {fi.preview ? (
                        <img
                          src={fi.preview}
                          alt=""
                          className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-cyan-100 flex items-center justify-center text-[9px] font-bold text-cyan-600 flex-shrink-0">
                          PDF
                        </div>
                      )}
                      <span className="flex-1 text-sm text-gray-700 truncate">{fi.file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {(fi.file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(fi.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M18 6L6 18M6 6l12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </FormInnerSection>

          <SectionTitle>Importe</SectionTitle>
          <FormInnerSection>
            <section className="space-y-4">
              <div className="flex gap-3">
                <Field label="Monto *">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 font-bold text-base select-none">
                      {currSymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={form.amount}
                      onChange={set("amount")}
                      className={`${INPUT_CLASS} pl-10`}
                    />
                  </div>
                </Field>
                <Field label="Moneda">
                  <select
                    value={form.currency}
                    onChange={set("currency")}
                    className={`${INPUT_CLASS}`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha de emisión">
                  <input
                    type="date"
                    value={form.issued_at}
                    onChange={set("issued_at")}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Fecha de pago *">
                  <input
                    type="date"
                    required
                    value={form.paid_at}
                    onChange={set("paid_at")}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </section>
          </FormInnerSection>

          <SectionTitle>Datos del comprobante</SectionTitle>
          <FormInnerSection>
            <section className="space-y-4">
              <Field label="Proveedor">
                <select
                  value={form.provider_id}
                  onChange={handleProviderChange}
                  disabled={providersLoading}
                  className={`${INPUT_CLASS} appearance-none cursor-pointer disabled:opacity-40`}
                >
                  <option value="">
                    {willCreateProvider ? `✦ ${resolvedProvider.name} (nuevo)` : "Sin proveedor"}
                  </option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Serie">
                  <input
                    type="text"
                    placeholder="Ej: F001"
                    value={form.invoice_series}
                    onChange={set("invoice_series")}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Número">
                  <input
                    type="text"
                    placeholder="Ej: 00012345"
                    value={form.invoice_number}
                    onChange={set("invoice_number")}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </section>
          </FormInnerSection>
          <SectionTitle>Detalles</SectionTitle>
          <FormInnerSection>
            <section className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Categoría">
                  <select
                    value={form.category_id}
                    onChange={set("category_id")}
                    disabled={catsLoading}
                    className={`${INPUT_CLASS} appearance-none cursor-pointer disabled:opacity-40`}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Método de pago">
                  <select
                    value={form.payment_method}
                    onChange={set("payment_method")}
                    className={`${INPUT_CLASS} appearance-none cursor-pointer`}
                  >
                    <option value="">Seleccionar</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notas">
                <textarea
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  value={form.notes}
                  onChange={set("notes")}
                  className={`${INPUT_CLASS} resize-none`}
                />
              </Field>
            </section>
          </FormInnerSection>

          {error && (
            <div className="flex items-start gap-3 border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600">
              <svg
                width="16"
                height="16"
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

          {/* Success */}
          {success && (
            <div className="flex items-center gap-3 border border-cyan-200 bg-cyan-50 rounded-lg px-4 py-3 text-sm text-cyan-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Gasto registrado correctamente — redirigiendo...
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={() => router.back()} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || success || !workspaceId || !userId || extracting}
              className={PRIMARY_BUTTON_CLASS}
            >
              {isPending ? (
                <>
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
                  Guardando...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17 21v-8H7v8M7 3v5h8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Guardar gasto
                </>
              )}
            </button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
