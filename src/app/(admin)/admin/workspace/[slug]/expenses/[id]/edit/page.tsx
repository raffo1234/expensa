"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import getAttachmentUrl from "@/lib/getAttachmentUrl";

// ── Types ────────────────────────────────────────────────────────────────────
type Category = { id: string; name: string; color: string | null };

type ExpenseAttachment = {
  id: string;
  file_name: string | null;
  storage_path: string;
};

type Expense = {
  id: string;
  provider: string | null;
  amount: number;
  currency: string;
  paid_at: string;
  payment_method: string | null;
  notes: string | null;
  category_id: string | null;
  category: Category | null;
  expense_attachment: ExpenseAttachment[];
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchExpense(expenseId: string): Promise<Expense> {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `
      id, provider, amount, currency, paid_at,
      payment_method, notes, category_id,
      category(id, name, color),
      expense_attachment(id, file_name, storage_path)
    `,
    )
    .eq("id", expenseId)
    .single();
  if (error) throw error;
  return data as unknown as Expense;
}

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("category").select("id, name, color").order("name");
  if (error) throw error;
  return data ?? [];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENCIES = ["PEN", "USD", "EUR"];
const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Yape", "Plin", "Otro"];
const BUCKET = "expenses"; // ← change to your actual bucket name

function isImage(path: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(path);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
      {children}
    </p>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900
                 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40
                 focus:border-cyan-400 transition-all"
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900
                 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400
                 transition-all appearance-none"
    >
      {children}
    </select>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EditExpensePage() {
  const params = useParams();
  const workspaceSlug = params.slug as string;
  const expenseId = params.id as string;
  const router = useRouter();

  const {
    data: expense,
    isLoading,
    error,
  } = useSWR(expenseId ? ["expense", expenseId] : null, ([, id]) => fetchExpense(id));
  const { data: categories = [] } = useSWR("categories", fetchCategories);

  // ── Form state ──
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [paidAt, setPaidAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // ── Attachment state ──
  const [existingAttachments, setExistingAttachments] = useState<ExpenseAttachment[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Populate form ──
  useEffect(() => {
    if (!expense) return;
    setProvider(expense.provider ?? "");
    setAmount((expense.amount / 100).toFixed(2));
    setCurrency(expense.currency.trim());
    setPaidAt(expense.paid_at);
    setPaymentMethod(expense.payment_method ?? "");
    setNotes(expense.notes ?? "");
    setCategoryId(expense.category_id ?? "");
    setExistingAttachments(expense.expense_attachment ?? []);
  }, [expense]);

  // ── Attachment handlers ──
  function removeExisting(id: string) {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
    setDeletedIds((prev) => [...prev, id]);
  }

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setNewFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = "";
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      // 1. Update expense row
      const { error: updateError } = await supabase
        .from("expense")
        .update({
          provider: provider.trim() || null,
          amount: Math.round(parseFloat(amount) * 100),
          currency,
          paid_at: paidAt,
          payment_method: paymentMethod || null,
          notes: notes.trim() || null,
          category_id: categoryId || null,
        })
        .eq("id", expenseId);
      if (updateError) throw updateError;

      // 2. Delete removed attachments (storage + row)
      for (const id of deletedIds) {
        const att = expense?.expense_attachment.find((a) => a.id === id);
        if (att) await supabase.storage.from(BUCKET).remove([att.storage_path]);
        await supabase.from("expense_attachment").delete().eq("id", id);
      }

      // 3. Upload new files
      for (const file of newFiles) {
        const ext = file.name.split(".").pop();
        const storagePath = `${expenseId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file);
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from("expense_attachment").insert({
          expense_id: expenseId,
          storage_path: storagePath,
          file_name: file.name,
        });
        if (insertError) throw insertError;
      }

      router.push(`/admin/workspace/${workspaceSlug}/expenses/${expenseId}`);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => router.push(`/admin/workspace/${workspaceSlug}/expenses`)}
              className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50"
            >
              Gastos
            </button>
            <span className="text-gray-300">/</span>
            <button
              onClick={() => router.push(`/admin/workspace/${workspaceSlug}/expenses/${expenseId}`)}
              className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50 truncate max-w-[120px]"
            >
              {isLoading ? "..." : (expense?.provider ?? "Sin proveedor")}
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium px-2 py-1">Editar</span>
          </div>
          <button
            onClick={() => router.push(`/admin/workspace/${workspaceSlug}/expenses/${expenseId}`)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1"
          >
            ← Volver
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
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
            Cargando gasto...
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600">
            No se pudo cargar el gasto. Intenta recargar la página.
          </div>
        )}

        {expense && (
          <div className="space-y-4">
            {/* Amount + currency */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest mb-4">
                Monto
              </h2>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Importe</Label>
                  <Input type="number" value={amount} onChange={setAmount} placeholder="0.00" />
                </div>
                <div className="w-28">
                  <Label>Moneda</Label>
                  <Select value={currency} onChange={setCurrency}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </section>

            {/* Details */}
            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
                Detalles
              </h2>

              <div>
                <Label>Proveedor</Label>
                <Input value={provider} onChange={setProvider} placeholder="Nombre del proveedor" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Fecha de pago</Label>
                  <Input type="date" value={paidAt} onChange={setPaidAt} />
                </div>
                <div className="flex-1">
                  <Label>Método de pago</Label>
                  <Select value={paymentMethod} onChange={setPaymentMethod}>
                    <option value="">Sin especificar</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label>Categoría</Label>
                <Select value={categoryId} onChange={setCategoryId}>
                  <option value="">Sin categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Notas</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                             text-gray-900 placeholder:text-gray-300 focus:outline-none
                             focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400
                             transition-all resize-none"
                />
              </div>
            </section>

            {/* Attachments */}
            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
                Adjuntos
              </h2>

              {/* Existing */}
              {existingAttachments.map((att) => {
                const url = getAttachmentUrl(att.storage_path);
                const image = isImage(att.storage_path);
                return (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3"
                  >
                    {image ? (
                      <img
                        src={url}
                        alt={att.file_name ?? "adjunto"}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-cyan-600">PDF</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {att.file_name ?? att.storage_path.split("/").pop()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{image ? "Imagen" : "PDF"}</p>
                    </div>
                    <button
                      onClick={() => removeExisting(att.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
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
                      </svg>
                    </button>
                  </div>
                );
              })}

              {/* New files queued */}
              {newFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-xl p-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0891b2"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cyan-800 truncate">{file.name}</p>
                    <p className="text-xs text-cyan-400 mt-0.5">
                      {(file.size / 1024).toFixed(0)} KB · Por subir
                    </p>
                  </div>
                  <button
                    onClick={() => removeNewFile(i)}
                    className="p-1.5 rounded-lg text-cyan-300 hover:text-red-400 hover:bg-red-50 transition-all"
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
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={addFiles}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed
                           border-gray-200 py-3 text-sm text-gray-400 hover:border-cyan-300
                           hover:text-cyan-500 hover:bg-cyan-50/40 transition-all"
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agregar archivo
              </button>
            </section>

            {/* Error */}
            {saveError && (
              <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600">
                {saveError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() =>
                  router.push(`/admin/workspace/${workspaceSlug}/expenses/${expenseId}`)
                }
                className="flex-1 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium
                           text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !amount || !paidAt}
                className="px-8 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                  boxShadow: "0 2px 8px rgba(6,182,212,0.25)",
                }}
              >
                {saving && (
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
                )}
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
