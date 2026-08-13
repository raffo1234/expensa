"use client";

import { useGlobalState } from "@/lib/globalState";
import { mutate } from "swr";
import AddProviderModal from "@/components/AddProviderModal";
import CategoryManagerModal from "@/components/CategoryManagerModal";
import ExpenseItemsEditor, { type ExpenseItemLine } from "@/components/ExpenseItemsEditor";
import { getMaterials } from "@/actions/materials";
import { getBrands } from "@/actions/brands";
import { getUnits } from "@/actions/units";
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
import {
  deleteAttachment,
  initiateMultipartUpload,
  getPartPresignedUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  registerAttachment,
  getExpenseItems,
  saveExpenseItems,
} from "@/actions/expenses";

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

async function fetchStages(
  workspaceId: string,
): Promise<{ id: string; name: string; order: number; color: string | null }[]> {
  const { data, error } = await supabase
    .from("stage")
    .select("id, name, order, color")
    .eq("workspace_id", workspaceId)
    .order("order");
  if (error) throw error;
  return data ?? [];
}

async function fetchLevels(
  workspaceId: string,
): Promise<{ id: string; name: string; order: number }[]> {
  const { data, error } = await supabase
    .from("level")
    .select("id, name, order")
    .eq("workspace_id", workspaceId)
    .order("order");
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

async function fetchExpense(expenseId: string, workspaceId: string): Promise<Expense> {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `
      id, amount, currency, issued_at, paid_at, payment_method, notes, created_at, invoice_series, invoice_number,
      provider:provider_id(id, name),
      category:category_id(id, name, color),
      stage:stage_id(id, name, color),
      level:level_id(id, name),
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

async function fetchMaterials(workspaceId: string) {
  return getMaterials(workspaceId);
}

async function fetchBrands(workspaceId: string) {
  return getBrands(workspaceId);
}

async function fetchUnits(workspaceId: string) {
  return getUnits(workspaceId);
}

async function fetchCategories(workspaceId: string): Promise<Category[]> {
  console.log("workid", workspaceId);
  const { data, error } = await supabase
    .from("category")
    .select("id, name, color")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  console.log({ data });
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
  const [stageId, setStageId] = useState("");
  const [levelId, setLevelId] = useState("");

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

  const { data: stages = [] } = useSWR(workspaceId ? ["stages", workspaceId] : null, ([, wid]) =>
    fetchStages(wid),
  );
  console.log({ stages });
  console.log({ workspaceId });

  const { data: levels = [] } = useSWR(workspaceId ? ["levels", workspaceId] : null, ([, wid]) =>
    fetchLevels(wid),
  );

  const { data: expense, error } = useSWR(
    expenseId && workspaceId ? ["expense", expenseId, workspaceId] : null,
    ([, id, wid]) => fetchExpense(id, wid),
  );
  const { data: categories = [] } = useSWR(
    workspaceId ? ["categories", workspaceId] : null,
    ([, wid]) => fetchCategories(wid),
  );
  console.log({ workspaceId });
  console.log({ categories });
  const { data: providers = [], isLoading: providersLoading } = useSWR(
    workspaceId ? ["providers", workspaceId] : null,
    ([, wid]) => fetchProviders(wid),
  );

  const { data: materials = [] } = useSWR(
    workspaceId ? ["materials", workspaceId] : null,
    ([, wid]) => fetchMaterials(wid),
  );

  const { data: brands = [] } = useSWR(workspaceId ? ["brands", workspaceId] : null, ([, wid]) =>
    fetchBrands(wid),
  );

  const { data: units = [] } = useSWR(workspaceId ? ["units", workspaceId] : null, ([, wid]) =>
    fetchUnits(wid),
  );

  const { data: existingItems } = useSWR(
    expenseId ? ["expense-items", expenseId] : null,
    ([, id]) => getExpenseItems(id),
  );

  const [itemLines, setItemLines] = useState<ExpenseItemLine[]>([]);

  useEffect(() => {
    if (!existingItems) return;
    setItemLines(
      existingItems.map((item) => ({
        id: item.id,
        material_id: item.material.id,
        brand_id: item.brand?.id ?? "",
        unit_id: item.unit.id,
        quantity: String(item.quantity),
        unit_price: item.unit_price != null ? (item.unit_price / 100).toFixed(2) : "",
      })),
    );
  }, [existingItems]);

  // ── Form state ──
  const [issuedAt, setIssuedAt] = useState("");
  const [provider_id, setProviderId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [paidAt, setPaidAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [invoiceSeries, setInvoiceSeries] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // ── Attachment state ──
  const [existingAttachments, setExistingAttachments] = useState<ExpenseAttachment[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { setModalContent, setModalOpen } = useGlobalState();

  const handleProviderCreated = (provider: { id: string; name: string; ruc: string }) => {
    mutate(["providers", workspaceId]);
    setProviderId(provider.id);
  };

  const openAddProvider = () => {
    setModalContent(
      <AddProviderModal workspaceId={workspaceId!} onSelect={handleProviderCreated} />,
    );
    setModalOpen(true);
  };

  const openCategoryManager = () => {
    setModalContent(
      <CategoryManagerModal
        workspaceId={workspaceId!}
        categories={categories}
        onUpdate={() => mutate(["categories", workspaceId])}
      />,
    );
    setModalOpen(true);
  };

  // ── Populate form ──
  useEffect(() => {
    if (!expense) return;
    setIssuedAt(expense.issued_at ? expense.issued_at.slice(0, 10) : "");
    setProviderId(expense.provider?.id ?? "");
    setAmount(((expense.amount ?? 0) / 100).toFixed(2));
    setCurrency(expense.currency ? expense.currency.trim() : "");
    setPaidAt(expense.paid_at ? expense.paid_at.slice(0, 10) : "");
    setPaymentMethod(expense.payment_method ?? "");
    setNotes(expense.notes ?? "");
    setCategoryId(expense.category?.id ?? "");
    setInvoiceSeries(expense.invoice_series ?? "");
    setInvoiceNumber(expense.invoice_number ?? "");
    setExistingAttachments(expense.expense_attachment ?? []);
    setStageId(expense.stage?.id ?? "");
    setLevelId(expense.level?.id ?? "");
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
          issued_at: issuedAt || null,
          paid_at: paidAt,
          payment_method: paymentMethod || null,
          notes: notes.trim() || null,
          category_id: categoryId || null,
          invoice_series: invoiceSeries.trim() || null,
          invoice_number: invoiceNumber.trim() || null,
          stage_id: stageId || null,
          level_id: levelId || null,
        })
        .eq("id", expenseId);
      if (updateError) throw updateError;

      // 1b. Save material line items
      const items = itemLines
        .filter((l) => l.material_id && l.unit_id && l.quantity)
        .map((l) => ({
          material_id: l.material_id,
          brand_id: l.brand_id || null,
          unit_id: l.unit_id,
          quantity: parseFloat(l.quantity),
          unit_price: l.unit_price ? Math.round(parseFloat(l.unit_price) * 100) : null,
        }));
      const { error: itemsError } = await saveExpenseItems(expenseId, items);
      if (itemsError) throw new Error(itemsError);

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
    <FormSection
      title={providersLoading ? "..." : (expense?.provider?.name ?? "Sin proveedor")}
      backUrl={`/admin/workspaces/${workspaceSlug}/expenses/${expenseId}`}
    >
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
        <div className="space-y-7">
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
            <div className="space-y-7">
              <Field label="Proveedor">
                <div className="flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={openAddProvider}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-cyan-400 hover:text-cyan-500 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Serie">
                  <Input
                    type="text"
                    value={invoiceSeries}
                    onChange={setInvoiceSeries}
                    placeholder="Ej: F001"
                  />
                </Field>
                <Field label="Número">
                  <Input
                    type="text"
                    value={invoiceNumber}
                    onChange={setInvoiceNumber}
                    placeholder="Ej: 00012345"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Fecha de emisión">
                  <Input type="date" value={issuedAt} onChange={(v) => setIssuedAt(v)} />
                </Field>
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
                <div className="flex items-center gap-2">
                  <Select value={categoryId} onChange={setCategoryId}>
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={openCategoryManager}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-cyan-400 hover:text-cyan-500 transition-colors"
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
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Etapa">
                  <Select value={stageId} onChange={setStageId}>
                    <option value="">Sin etapa</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Nivel">
                  <Select value={levelId} onChange={setLevelId}>
                    <option value="">Sin nivel</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

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

          <SectionTitle>Materiales</SectionTitle>
          <FormInnerSection>
            <ExpenseItemsEditor
              workspaceId={workspaceId ?? ""}
              lines={itemLines}
              onChange={setItemLines}
              materials={materials}
              brands={brands}
              units={units}
              onMaterialsChange={() => mutate(["materials", workspaceId])}
              onBrandsChange={() => mutate(["brands", workspaceId])}
              onUnitsChange={() => mutate(["units", workspaceId])}
            />
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
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <img
                          src={url}
                          alt={att.file_name ?? "adjunto"}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                        />
                      </a>
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
  );
}
