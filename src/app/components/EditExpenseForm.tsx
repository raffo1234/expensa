"use client";

import SubmitButton from "./SubmitButton";
import { useGlobalState } from "@/lib/globalState";
import { mutate } from "swr";
import AddProviderModal from "@/components/AddProviderModal";
import CategoryManagerModal from "@/components/CategoryManagerModal";
import ExpenseItemsEditor, {
  incompleteItemLines,
  type ExpenseItemLine,
} from "@/components/ExpenseItemsEditor";
import { getMaterials } from "@/actions/materials";
import { getBrands } from "@/actions/brands";
import { getUnits } from "@/actions/units";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import {
  getCategories,
  getExpenseForEdit,
  getLevels,
  getProviders,
  getStages,
  getWorkspaceBySlug,
} from "@/actions/lookups";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import { Expense } from "@/types/ExpenseType";
import { TAX_STATUS_LABELS, type TaxStatus } from "@/lib/invoiceTax";
import { Category } from "@/types/CategoryType";
import { ExpenseAttachment } from "@/types/ExpenseAttachment";
import { Provider } from "@/types/ProviderType";
import FormSection from "@/components/FormSection";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/constants";
import FormInnerSection from "@/components/FormInnerSection";
import SectionTitle from "@/components/SectionTitle";
import Field from "@/components/Field";
import {
  deleteAttachment,
  getExpenseItems,
  saveExpenseItems,
  updateExpense,
} from "@/actions/expenses";
import { uploadExpenseAttachment } from "@/lib/uploadExpenseAttachment";

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENCIES = ["PEN", "USD", "EUR"];
const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Yape", "Plin", "Otro"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isImage(path: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(path);
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const fetchStages = (workspaceId: string) => getStages(workspaceId);

const fetchLevels = (workspaceId: string) => getLevels(workspaceId);

const fetchProviders = (workspaceId: string): Promise<Provider[]> => getProviders(workspaceId);

async function fetchExpense(expenseId: string, workspaceId: string): Promise<Expense> {
  const data = await getExpenseForEdit(expenseId, workspaceId);
  if (!data) throw new Error("Expense not found");
  return data as unknown as Expense;
}

const fetchWorkspace = (slug: string): Promise<{ id: string; name: string }> =>
  getWorkspaceBySlug(slug);

async function fetchMaterials(workspaceId: string) {
  return getMaterials(workspaceId);
}

async function fetchBrands(workspaceId: string) {
  return getBrands(workspaceId);
}

async function fetchUnits(workspaceId: string) {
  return getUnits(workspaceId);
}

const fetchCategories = (workspaceId: string): Promise<Category[]> => getCategories(workspaceId);

// ── Sub-components ────────────────────────────────────────────────────────────
function Input({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={INPUT_CLASS}
    />
  );
}
Input.acceptsFieldId = true;

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={SELECT_CLASS}
    >
      {children}
    </select>
  );
}
Select.acceptsFieldId = true;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EditExpenseForm() {
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
  const [incompleteIds, setIncompleteIds] = useState<string[]>([]);

  // Fill the form once. Later revalidations (on mount or tab focus) return the
  // same data and would otherwise wipe edits the user hasn't saved yet.
  const itemsLoadedRef = useRef(false);
  const expenseLoadedRef = useRef(false);

  useEffect(() => {
    if (!existingItems || itemsLoadedRef.current) return;
    itemsLoadedRef.current = true;
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
  const [taxStatus, setTaxStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [invoiceSeries, setInvoiceSeries] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // ── Attachment state ──
  const [existingAttachments, setExistingAttachments] = useState<ExpenseAttachment[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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
    if (!expense || expenseLoadedRef.current) return;
    expenseLoadedRef.current = true;
    setIssuedAt(expense.issued_at ? expense.issued_at.slice(0, 10) : "");
    setProviderId(expense.provider?.id ?? "");
    setAmount(((expense.amount ?? 0) / 100).toFixed(2));
    setCurrency(expense.currency ? expense.currency.trim() : "");
    setPaidAt(expense.paid_at ? expense.paid_at.slice(0, 10) : "");
    setPaymentMethod(expense.payment_method ?? "");
    setTaxStatus(expense.tax_status ?? "");
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

  function addFiles(files: File[]) {
    // Dropped files skip the input's `accept`, so filter them here too.
    const allowed = files.filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf",
    );
    if (allowed.length) setNewFiles((prev) => [...prev, ...allowed]);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    // Ignore leave events fired when moving over the label's own children.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Save ──
  async function handleSave() {
    const incomplete = incompleteItemLines(itemLines);
    setIncompleteIds(incomplete.map((l) => l.id));
    if (incomplete.length) {
      setSaveError(
        `${incomplete.length === 1 ? "Hay 1 material incompleto" : `Hay ${incomplete.length} materiales incompletos`}: elige material, unidad y cantidad, o quítalo${incomplete.length === 1 ? "" : "s"}.`,
      );
      return;
    }

    let saved = false;
    setSaving(true);
    setSaveError(null);
    setUploadProgress({});

    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    try {
      // 1. Update expense row
      const { error: updateError } = await updateExpense(expenseId, {
        provider_id: provider_id || null,
        amount: Math.round(parseFloat(amount) * 100),
        currency,
        issued_at: issuedAt || null,
        paid_at: paidAt,
        payment_method: paymentMethod || null,
        tax_status: (taxStatus || null) as TaxStatus | null,
        notes: notes.trim() || null,
        category_id: categoryId || null,
        invoice_series: invoiceSeries.trim() || null,
        invoice_number: invoiceNumber.trim() || null,
        stage_id: stageId || null,
        level_id: levelId || null,
      });
      if (updateError) throw new Error(updateError);

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
          const { error } = await deleteAttachment(att.id);
          if (error) throw new Error(error);
        }
      }

      // 3. Upload new files via multipart
      await Promise.all(
        newFiles.map(async (file, i) => {
          setUploadProgress((prev) => ({ ...prev, [i]: 0 }));

          await uploadExpenseAttachment(
            file,
            expenseId,
            (pct) => setUploadProgress((prev) => ({ ...prev, [i]: pct })),
            signal,
          );
        }),
      );

      saved = true;
      router.push(`/admin/workspaces/${workspaceSlug}/expenses/${expenseId}`);
    } catch (err: unknown) {
      if ((err as Error)?.message === "Upload cancelado") {
        setSaveError("Subida cancelada.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Error al guardar");
      }
    } finally {
      // After a save the button stays busy until the page changes.
      if (!saved) setSaving(false);
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
                    aria-label="Agregar proveedor"
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
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

              <Field label="Situación fiscal">
                <Select value={taxStatus} onChange={setTaxStatus}>
                  <option value="">Sin especificar</option>
                  {(Object.keys(TAX_STATUS_LABELS) as TaxStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {TAX_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              </Field>

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
                    aria-label="Gestionar categorías"
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              highlightIds={incompleteIds}
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
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0"
                      >
                        <span className="text-[9px] font-bold text-violet-600">PDF</span>
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {att.file_name ?? att.storage_path.split("/").pop()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{image ? "Imagen" : "PDF"}</p>
                    </div>
                    <RemoveFileButton
                      fileName={att.file_name ?? att.storage_path.split("/").pop() ?? "archivo"}
                      onClick={() => removeExisting(att.id)}
                    />
                  </div>
                );
              })}

              {/* New files queued */}
              {newFiles.map((file, i) => {
                const pct = uploadProgress[i] ?? null;
                return (
                  <div key={i} className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
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
                        <p className="text-sm font-medium text-violet-800 truncate">{file.name}</p>
                        <p className="text-xs text-violet-400 mt-0.5">
                          {pct !== null
                            ? `${pct}%`
                            : `${(file.size / 1024).toFixed(0)} KB · Por subir`}
                        </p>
                      </div>
                      {pct === null && (
                        <RemoveFileButton fileName={file.name} onClick={() => removeNewFile(i)} />
                      )}
                    </div>
                    {pct !== null && (
                      <div className="mt-2 h-1 rounded-full bg-violet-200 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 transition-all duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm transition-all cursor-pointer ${
                  isDragging
                    ? "border-violet-500 bg-violet-50 text-violet-600"
                    : "border-gray-200 text-gray-400 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50/40"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="sr-only"
                  aria-label="Adjuntar comprobante: imágenes o PDF"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    // Allow picking the same file again after removing it.
                    e.target.value = "";
                  }}
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
                {isDragging ? (
                  "Suelta los archivos aquí"
                ) : (
                  <span>
                    Agregar archivo <span className="hidden sm:inline">o arrástralo aquí</span>
                  </span>
                )}
              </label>
            </div>
          </FormInnerSection>

          {saveError && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}

          {/* Pinned to the bottom on phones so saving never needs a long scroll. */}
          <div className="sticky bottom-0 z-20 -mx-4 flex items-center gap-3 border-t border-gray-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-1">
            <button
              type="button"
              onClick={() =>
                router.push(`/admin/workspaces/${workspaceSlug}/expenses/${expenseId}`)
              }
              className={`${SECONDARY_BUTTON_CLASS} flex-1 justify-center sm:flex-none min-h-11`}
            >
              Cancelar
            </button>
            <SubmitButton
              type="button"
              onClick={handleSave}
              pending={saving}
              disabled={!amount || !paidAt}
              className="flex-1 justify-center sm:flex-none min-h-11"
            >
              Guardar cambios
            </SubmitButton>
          </div>
        </div>
      )}
    </FormSection>
  );
}

// 44px touch target on mobile / 40px on desktop, visible at rest (≥3:1 contrast),
// red only on hover/focus so the destructive action doesn't dominate the list.
function RemoveFileButton({ fileName, onClick }: { fileName: string; onClick: () => void }) {
  const label = `Quitar ${fileName}`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 active:scale-95 transition-all cursor-pointer"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  );
}
