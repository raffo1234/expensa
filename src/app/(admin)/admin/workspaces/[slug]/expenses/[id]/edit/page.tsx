"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import { Expense } from "@/types/ExpenseType";
import { Category } from "@/types/CategoryType";
import { ExpenseAttachment } from "@/types/ExpenseAttachment";
import { Provider } from "@/types/ProviderType";
import FormSection from "@/components/FormSection";
import {
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SELECT_CLASS,
} from "@/constants";
import FormInnerSection from "@/components/FormInnerSection";
import SectionTitle from "@/components/SectionTitle";
import Field from "@/components/Field";
import BackLink from "@/components/BackLink";
import {
  deleteAttachment,
  initiateMultipartUpload,
  getPartPresignedUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  registerAttachment,
} from "@/actions/expenses";
import Link from "next/link";
import TitleWrapper from "@/components/TitleWrapper";
import PageTitle from "@/components/PageTitle";

// ── Constants ─────────────────────────────────────────────────────────────────
const PART_SIZE = 5 * 1024 * 1024;
const CURRENCIES = ["PEN", "USD", "EUR"];
const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Yape", "Plin", "Otro"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isImage(path: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(path);
}

// ── Multipart uploader ────────────────────────────────────────────────────────
async function uploadFileMultipart(
  file: File,
  expenseId: string,
  workspaceSlug: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const { uploadId, key } = await initiateMultipartUpload(
    expenseId,
    workspaceSlug,
    file.name,
    file.type,
  );

  const totalParts = Math.ceil(file.size / PART_SIZE);
  const parts: { PartNumber: number; ETag: string }[] = [];

  try {
    for (let i = 0; i < totalParts; i++) {
      if (signal.aborted) throw new Error("Upload cancelado");

      const partNumber = i + 1;
      const start = i * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const chunk = file.slice(start, end);

      const { url } = await getPartPresignedUrl(key, uploadId, partNumber);

      const res = await fetch(url, {
        method: "PUT",
        body: chunk,
        headers: { "Content-Type": file.type },
        signal,
      });

      if (!res.ok) throw new Error(`Parte ${partNumber} falló: ${res.status}`);

      const etag = res.headers.get("ETag");
      if (!etag) throw new Error(`Sin ETag en parte ${partNumber}`);

      parts.push({ PartNumber: partNumber, ETag: etag });
      onProgress(Math.round((partNumber / totalParts) * 100));
    }

    await completeMultipartUpload(key, uploadId, parts);
    return key;
  } catch (err) {
    await abortMultipartUpload(key, uploadId).catch(() => {});
    throw err;
  }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchProviders(workspaceId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("provider")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

async function fetchExpense(expenseId: string, workspaceId: string): Promise<Expense> {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `
      id, amount, currency, paid_at, payment_method, notes, created_at,
      provider:provider_id(id, name),
      category:category_id(id, name, color),
      expense_attachment(id, file_name, storage_path)
    `,
    )
    .eq("id", expenseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Expense not found");
  return data as unknown as Expense;
}

async function fetchWorkspace(slug: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from("workspace")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Workspace not found");
  return data;
}

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("category").select("id, name, color").order("name");
  if (error) throw error;
  return data ?? [];
}

// ── Sub-components ────────────────────────────────────────────────────────────
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
      className={INPUT_CLASS}
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
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

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const { data: workspace } = useSWR(
    workspaceSlug ? ["workspace", workspaceSlug] : null,
    ([, slug]) => fetchWorkspace(slug),
  );

  const workspaceId = workspace?.id;

  const { data: expense, error } = useSWR(
    expenseId && workspaceId ? ["expense", expenseId, workspaceId] : null,
    ([, id, wid]) => fetchExpense(id, wid),
  );
  const { data: categories = [] } = useSWR("categories", fetchCategories);

  const { data: providers = [], isLoading: providersLoading } = useSWR(
    workspaceId ? ["providers", workspaceId] : null,
    ([, wid]) => fetchProviders(wid),
  );

  // ── Form state ──
  const [provider_id, setProviderId] = useState<string | null>(null);
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
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Populate form ──
  useEffect(() => {
    if (!expense) return;
    setProviderId(expense.provider?.id ?? "");
    setAmount(((expense.amount ?? 0) / 100).toFixed(2));
    setCurrency(expense.currency ? expense.currency.trim() : "");
    setPaidAt(expense.paid_at ?? "");
    setPaymentMethod(expense.payment_method ?? "");
    setNotes(expense.notes ?? "");
    setCategoryId(expense.category?.id ?? "");
    setExistingAttachments(expense.expense_attachment ?? []);
  }, [expense]);

  // ── Attachment handlers ──
  function removeExisting(id: string) {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
    setDeletedIds((prev) => [...prev, id]);
  }

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [...prev, ...files]);
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setUploadProgress({});

    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    try {
      // 1. Update expense row
      const { error: updateError } = await supabase
        .from("expense")
        .update({
          provider_id: provider_id || null,
          amount: Math.round(parseFloat(amount) * 100),
          currency,
          paid_at: paidAt,
          payment_method: paymentMethod || null,
          notes: notes.trim() || null,
          category_id: categoryId || null,
        })
        .eq("id", expenseId);
      if (updateError) throw updateError;

      // 2. Delete removed attachments
      for (const id of deletedIds) {
        const att = expense?.expense_attachment?.find((a) => a.id === id);
        if (att) {
          const { error } = await deleteAttachment(att.id, att.storage_path);
          if (error) throw new Error(error);
        }
      }

      // 3. Upload new files via multipart
      await Promise.all(
        newFiles.map(async (file, i) => {
          setUploadProgress((prev) => ({ ...prev, [i]: 0 }));

          const storagePath = await uploadFileMultipart(
            file,
            expenseId,
            workspaceSlug,
            (pct) => setUploadProgress((prev) => ({ ...prev, [i]: pct })),
            signal,
          );

          await registerAttachment(expenseId, storagePath, file.name);
        }),
      );

      router.push(`/admin/workspaces/${workspaceSlug}/expenses/${expenseId}`);
    } catch (err: unknown) {
      if ((err as Error)?.message === "Upload cancelado") {
        setSaveError("Subida cancelada.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <BackLink href={`/admin/workspaces/${workspaceSlug}/expenses/${expenseId}`}>Volver</BackLink>
      <TitleWrapper>
        <PageTitle>
          <Link
            href={`/admin/workspaces/${workspaceSlug}/expenses`}
            className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50"
          >
            Gastos
          </Link>
          <span className="text-gray-300">/</span>
          <Link
            href={`/admin/workspaces/${workspaceSlug}/expenses/${expenseId}`}
            className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50 truncate max-w-[120px]"
          >
            {providersLoading ? "..." : (expense?.provider?.name ?? "Sin proveedor")}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium px-2 py-1">Editar</span>
        </PageTitle>
      </TitleWrapper>
      <FormSection>
        {providersLoading && (
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
          <div className="space-y-6">
            <SectionTitle>Monto</SectionTitle>
            <FormInnerSection>
              <div className="flex gap-3">
                <Field label="Importe">
                  <Input type="number" value={amount} onChange={setAmount} placeholder="0.00" />
                </Field>
                <Field label="Moneda">
                  <Select value={currency} onChange={setCurrency}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </FormInnerSection>

            <SectionTitle>Detalles</SectionTitle>
            <FormInnerSection>
              <div className="space-y-6">
                <Field label="Proveedor">
                  <select
                    value={provider_id ?? ""}
                    onChange={(e) => setProviderId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Sin proveedor</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="flex items-center gap-3">
                  <Field label="Fecha de pago">
                    <Input type="date" value={paidAt} onChange={setPaidAt} />
                  </Field>
                  <Field label="Método de pago">
                    <Select value={paymentMethod} onChange={setPaymentMethod}>
                      <option value="">Sin especificar</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Categoría" hint="Clasifica tus gastos para un mejor análisis.">
                  <Select value={categoryId} onChange={setCategoryId}>
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Notas">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={3}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </FormInnerSection>

            <SectionTitle>Adjuntos</SectionTitle>
            <FormInnerSection>
              <div className="space-y-3">
                {/* Existing attachments */}
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
                {newFiles.map((file, i) => {
                  const pct = uploadProgress[i] ?? null;
                  return (
                    <div key={i} className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                      <div className="flex items-center gap-3">
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
                            {pct !== null
                              ? `${pct}%`
                              : `${(file.size / 1024).toFixed(0)} KB · Por subir`}
                          </p>
                        </div>
                        {pct === null && (
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
                        )}
                      </div>
                      {pct !== null && (
                        <div className="mt-2 h-1 rounded-full bg-cyan-200 overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-200"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                <label className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm text-gray-400 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/40 transition-all cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={addFiles}
                  />
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
                </label>
              </div>
            </FormInnerSection>

            {saveError && (
              <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600">
                {saveError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() =>
                  router.push(`/admin/workspaces/${workspaceSlug}/expenses/${expenseId}`)
                }
                className={SECONDARY_BUTTON_CLASS}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !amount || !paidAt}
                className={PRIMARY_BUTTON_CLASS}
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
      </FormSection>
    </div>
  );
}
