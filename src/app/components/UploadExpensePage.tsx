"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createExpense } from "@/actions/expenses";

// ── Types ────────────────────────────────────────────────────────────────────
type Category = { id: string; name: string; color: string | null };
type Provider = { id: string; name: string };
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
    .select("id, name")
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

const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:border-cyan-500 " +
  "focus:ring-2 focus:ring-cyan-500/10 transition-all duration-150 shadow-sm";

const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

// ── Component ────────────────────────────────────────────────────────────────
export default function UploadExpensePage({ userId }: { userId: string }) {
  const params = useParams();
  const workspaceSlug = params.slug as string;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
    provider_id: "",
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
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const addFiles = useCallback((incoming: File[]) => {
    const allowed = incoming.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type),
    );
    setFiles((prev) => [
      ...prev,
      ...allowed.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })),
    ]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles],
  );

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workspaceId) {
      setError("No se pudo obtener el workspace. Intenta recargar la página.");
      return;
    }
    if (!userId) {
      setError("No se pudo obtener el usuario autenticado. Intenta recargar la página.");
      return;
    }

    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError("El monto debe ser un número mayor a 0.");
      return;
    }

    const serializedFiles = await Promise.all(
      files.map(async (fi) => {
        const buf = await fi.file.arrayBuffer();
        return {
          name: fi.file.name,
          type: fi.file.type,
          buffer: Array.from(new Uint8Array(buf)),
        };
      }),
    );

    startTransition(async () => {
      const result = await createExpense({
        workspace_id: workspaceId,
        workspace_slug: workspaceSlug,
        created_by: userId,
        category_id: form.category_id || undefined,
        provider_id: form.provider_id || undefined,
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
        setTimeout(() => router.push(`/admin/workspace/${workspaceSlug}/expenses`), 1200);
      }
    });
  };

  const currSymbol = form.currency === "PEN" ? "S/" : form.currency === "USD" ? "$" : "€";

  return (
    <div
      className="min-h-screen text-gray-900"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fafafa" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Nav */}
      <nav
        className="sticky top-0 z-10 border-b border-gray-200/80"
        style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => router.push(`/admin/workspace/${workspaceSlug}/expenses`)}
              className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50"
            >
              Gastos
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium px-2 py-1">Nuevo</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nuevo gasto</h1>
          <p className="text-sm text-gray-500 mt-1">Registra un gasto y adjunta el comprobante.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Importe */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
              Importe
            </h2>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Monto *</label>
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
                    className={`${inputCls} pl-10 text-xl font-bold
                      [appearance:textfield]
                      [&::-webkit-outer-spin-button]:appearance-none
                      [&::-webkit-inner-spin-button]:appearance-none`}
                  />
                </div>
              </div>
              <div className="w-28">
                <label className={labelCls}>Moneda</label>
                <select
                  value={form.currency}
                  onChange={set("currency")}
                  className={`${inputCls} h-[50px] appearance-none cursor-pointer`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fecha de emisión</label>
                <input
                  type="date"
                  value={form.issued_at}
                  onChange={set("issued_at")}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Fecha de pago *</label>
                <input
                  type="date"
                  required
                  value={form.paid_at}
                  onChange={set("paid_at")}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Comprobante */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
              Comprobante
            </h2>

            <div>
              <label className={labelCls}>Proveedor</label>
              <select
                value={form.provider_id}
                onChange={set("provider_id")}
                disabled={providersLoading}
                className={`${inputCls} appearance-none cursor-pointer disabled:opacity-40`}
              >
                <option value="">Sin proveedor</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Serie</label>
                <input
                  type="text"
                  placeholder="Ej: F001"
                  value={form.invoice_series}
                  onChange={set("invoice_series")}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>Número</label>
                <input
                  type="text"
                  placeholder="Ej: 00012345"
                  value={form.invoice_number}
                  onChange={set("invoice_number")}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
          </section>

          {/* Detalles */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
              Detalles
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Categoría</label>
                <select
                  value={form.category_id}
                  onChange={set("category_id")}
                  disabled={catsLoading}
                  className={`${inputCls} appearance-none cursor-pointer disabled:opacity-40`}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Método de pago</label>
                <select
                  value={form.payment_method}
                  onChange={set("payment_method")}
                  className={`${inputCls} appearance-none cursor-pointer`}
                >
                  <option value="">Seleccionar</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Notas</label>
              <textarea
                rows={3}
                placeholder="Observaciones adicionales..."
                value={form.notes}
                onChange={set("notes")}
                className={`${inputCls} resize-none`}
              />
            </div>
          </section>

          {/* Adjuntos */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
            <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
              Adjuntos
            </h2>

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
                    ? "border-cyan-400 bg-cyan-50"
                    : "border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/40"
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
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP, PDF — máx 10 MB c/u</p>
              </div>
            </label>

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

          {/* Error */}
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
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium
                         text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || success || !workspaceId || !userId}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg
                         text-sm font-semibold text-white transition-all duration-150
                         active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                boxShadow: "0 2px 12px rgba(6,182,212,0.35), 0 1px 3px rgba(6,182,212,0.2)",
              }}
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
                      strokeLinejoin="round"
                    />
                  </svg>
                  Guardar gasto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
