"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useRouter, useParams } from "next/navigation";
import {
  getCategories,
  getLevels,
  getProviders,
  getStages,
  getWorkspaceBySlug,
} from "@/actions/lookups";
import { createExpense, checkDuplicateExpenses } from "@/actions/expenses";
import { uploadExpenseAttachment } from "@/lib/uploadExpenseAttachment";
import type { DuplicateCandidate } from "@/actions/expenses";
import FormSection from "./FormSection";
import FormInnerSection from "./FormInnerSection";
import {
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SELECT_CLASS,
} from "@/constants";
import SectionTitle from "./SectionTitle";
import Field from "./Field";
import { useGlobalState } from "@/lib/globalState";
import AddProviderModal from "./AddProviderModal";
import CategoryManagerModal from "./CategoryManagerModal";
import ExpenseItemsEditor, {
  createSuggestedCatalogItems,
  incompleteItemLines,
  type ExpenseItemLine,
} from "./ExpenseItemsEditor";
import { getMaterials } from "@/actions/materials";
import { getBrands } from "@/actions/brands";
import { getUnits } from "@/actions/units";
import type { ExtractedExpense } from "@/api/extract-expense/route";
import { TAX_STATUS_LABELS, type TaxStatus, type TotalsCheck } from "@/lib/invoiceTax";
import { matchBrand, matchMaterial, matchUnit } from "@/lib/matchCatalog";

// ── Types ────────────────────────────────────────────────────────────────────
type Category = { id: string; name: string; color: string | null };
type Provider = { id: string; name: string; ruc: string };
type Stage = { id: string; name: string; order: number; color: string | null };
type Level = { id: string; name: string; order: number };
type FileItem = { id: string; file: File; preview?: string };

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

// ── SWR fetchers ─────────────────────────────────────────────────────────────
const fetchWorkspace = (slug: string): Promise<{ id: string }> => getWorkspaceBySlug(slug);

const fetchCategories = (workspaceId: string): Promise<Category[]> => getCategories(workspaceId);

const fetchProviders = (workspaceId: string): Promise<Provider[]> => getProviders(workspaceId);

const fetchStages = (workspaceId: string): Promise<Stage[]> => getStages(workspaceId);

const fetchLevels = (workspaceId: string): Promise<Level[]> => getLevels(workspaceId);

async function fetchMaterials(workspaceId: string) {
  return getMaterials(workspaceId);
}

async function fetchBrands(workspaceId: string) {
  return getBrands(workspaceId);
}

async function fetchUnits(workspaceId: string) {
  return getUnits(workspaceId);
}

// ── Receipt extractor ─────────────────────────────────────────────────────────
type ReceiptCatalog = { materials: string[]; brands: string[]; units: string[] };

async function extractFromReceipt(file: File, catalog: ReceiptCatalog): Promise<ExtractedExpense> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch("/api/extract-expense", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType: file.type, catalog }),
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
  const abortRef = useRef<AbortController | null>(null);
  const filesRef = useRef<FileItem[]>([]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      filesRef.current.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
  }, []);

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

  const { data: stages = [] } = useSWR(workspaceId ? ["stages", workspaceId] : null, ([, wid]) =>
    fetchStages(wid),
  );

  const { data: levels = [] } = useSWR(workspaceId ? ["levels", workspaceId] : null, ([, wid]) =>
    fetchLevels(wid),
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

  const [itemLines, setItemLines] = useState<ExpenseItemLine[]>([]);
  const [incompleteIds, setIncompleteIds] = useState<string[]>([]);

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
    stage_id: "",
    level_id: "",
    notes: "",
    tax_status: "" as TaxStatus | "",
  });
  const [totalsCheck, setTotalsCheck] = useState<TotalsCheck | null>(null);

  const [resolvedProvider, setResolvedProvider] = useState<{
    ruc: string | null;
    name: string | null;
  }>({ ruc: null, name: null });

  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extracting, setExtracting] = useState(false);
  // Outcome of reading the receipt, so a failed read is never silent.
  const [readResult, setReadResult] = useState<{ ok: boolean; fileName: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [skipDupCheck, setSkipDupCheck] = useState(false);

  const { setModalContent, setModalOpen } = useGlobalState();

  const handleProviderCreated = (provider: { id: string; name: string; ruc: string }) => {
    mutate(["providers", workspaceId]);
    setForm((f) => ({ ...f, provider_id: provider.id }));
    setResolvedProvider({ ruc: provider.ruc, name: provider.name });
  };

  const openAddProvider = () => {
    setModalContent(
      <AddProviderModal workspaceId={workspaceId} onSelect={handleProviderCreated} />,
    );
    setModalOpen(true);
  };

  const openCategoryManager = () => {
    setModalContent(
      <CategoryManagerModal
        workspaceId={workspaceId}
        categories={categories}
        onUpdate={() => mutate(["categories", workspaceId])}
      />,
    );
    setModalOpen(true);
  };

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const willCreateProvider = resolvedProvider.ruc !== null && !form.provider_id;

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

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

      // Prefer the invoice PDF when several files are dropped (e.g. PDF + payment screenshot).
      const toRead = allowed.find((f) => f.type === "application/pdf") ?? allowed[0];

      setExtracting(true);
      setReadResult(null);
      setResolvedProvider({ ruc: null, name: null });

      try {
        const extracted = await extractFromReceipt(toRead, {
          materials: materials.map((m) => m.name),
          brands: brands.map((b) => b.name),
          units: units.map((u) => u.name),
        });

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
          ...(extracted.tax_status ? { tax_status: extracted.tax_status } : {}),
        }));

        // Fill materials only when the user hasn't started the list themselves.
        if (extracted.items?.length) {
          const aiLines: ExpenseItemLine[] = extracted.items.map((item) => {
            const material = matchMaterial(item.material, materials);
            const brand = matchBrand(item.brand, brands);
            const unit = matchUnit(item.unit, units);
            const price = item.paid_unit_price ?? item.unit_price;
            return {
              id: crypto.randomUUID(),
              material_id: material?.id ?? "",
              brand_id: brand?.id ?? "",
              unit_id: unit?.id ?? "",
              quantity: item.quantity ? String(item.quantity) : "",
              unit_price: price != null ? String(price) : "",
              ai: true,
              suggested: {
                material: material ? undefined : item.material || undefined,
                brand: brand ? undefined : item.brand || undefined,
                unit: unit ? undefined : item.unit || undefined,
              },
            };
          });
          setItemLines((prev) => (prev.length ? prev : aiLines));
          setTotalsCheck(extracted.totals_check);
        }

        if (extracted.provider_ruc || extracted.provider_name) {
          const match = providers.find(
            (p) =>
              (extracted.provider_ruc && p.ruc === extracted.provider_ruc) ||
              (extracted.provider_name &&
                p.name.toLowerCase().includes(extracted.provider_name.toLowerCase())),
          );

          if (match) {
            setForm((f) => ({ ...f, provider_id: match.id }));
            setResolvedProvider({ ruc: match.ruc, name: match.name });
          } else {
            setForm((f) => ({ ...f, provider_id: "" }));
            setResolvedProvider({
              ruc: extracted.provider_ruc ?? null,
              name: extracted.provider_name ?? null,
            });
          }
        }
        setReadResult({ ok: true, fileName: toRead.name });
      } catch {
        setReadResult({ ok: false, fileName: toRead.name });
      } finally {
        setExtracting(false);
      }
    },
    [providers, materials, brands, units],
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

  const saveExpense = async () => {
    const amountCents = Math.round(parseFloat(form.amount) * 100);

    setUploadProgress({});
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setIsPending(true);
    try {
      // Materials, brands and units read from the invoice that the catalog
      // doesn't have yet are created now, only once the expense is saved.
      const resolvedLines = await createSuggestedCatalogItems(workspaceId, itemLines);
      const items = resolvedLines
        .filter((l) => l.material_id && l.unit_id && l.quantity)
        .map((l) => ({
          material_id: l.material_id,
          brand_id: l.brand_id || null,
          unit_id: l.unit_id,
          quantity: parseFloat(l.quantity),
          unit_price: l.unit_price ? Math.round(parseFloat(l.unit_price) * 100) : null,
        }));
      if (resolvedLines.some((l) => l.suggested)) {
        mutate(["materials", workspaceId]);
        mutate(["brands", workspaceId]);
        mutate(["units", workspaceId]);
      }

      const result = await createExpense({
        workspace_id: workspaceId,
        workspace_slug: workspaceSlug,
        created_by: userId,
        category_id: form.category_id || undefined,
        stage_id: form.stage_id || undefined,
        level_id: form.level_id || undefined,
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
        tax_status: form.tax_status || null,
        items: items.length ? items : undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      await Promise.all(
        files.map(async (fi) => {
          setUploadProgress((prev) => ({ ...prev, [fi.id]: 0 }));
          await uploadExpenseAttachment(
            fi.file,
            result.id!,
            (pct) => setUploadProgress((prev) => ({ ...prev, [fi.id]: pct })),
            signal,
          );
        }),
      );

      setSuccess(true);
      setTimeout(() => router.push(`/admin/workspaces/${workspaceSlug}/expenses`), 1200);
    } catch (err) {
      if ((err as Error)?.name === "AbortError" || (err as Error)?.message === "Upload cancelado") {
        setError("Subida cancelada.");
      } else {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    } finally {
      setIsPending(false);
    }
  };

  const showDuplicateModal = (dupes: DuplicateCandidate[]) => {
    setModalContent(
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Posible duplicado</h2>
        <p className="text-sm text-gray-600">
          Se encontraron gastos con el mismo monto y fecha de pago. ¿Deseas guardar de todos modos?
        </p>
        <ul className="space-y-2">
          {dupes.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
            >
              <div className="flex-1 text-sm">
                <span className="font-medium text-gray-800">
                  {form.currency === "PEN" ? "S/" : form.currency === "USD" ? "$" : "€"}
                  {(d.amount / 100).toFixed(2)}
                </span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-gray-600">{d.paid_at}</span>
                {d.provider_name && (
                  <>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-600">{d.provider_name}</span>
                  </>
                )}
                {d.invoice_series && d.invoice_number && (
                  <>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-500 text-xs">
                      {d.invoice_series}-{d.invoice_number}
                    </span>
                  </>
                )}
              </div>
              <a
                href={`/admin/workspaces/${workspaceSlug}/expenses/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 hover:text-cyan-800 underline underline-offset-2 flex-shrink-0"
              >
                Ver
              </a>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className={SECONDARY_BUTTON_CLASS}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setModalOpen(false);
              setSkipDupCheck(true);
            }}
            className={PRIMARY_BUTTON_CLASS}
          >
            Guardar de todos modos
          </button>
        </div>
      </div>,
    );
    setModalOpen(true);
  };

  useEffect(() => {
    if (skipDupCheck) {
      setSkipDupCheck(false);
      saveExpense();
    }
  }, [skipDupCheck]);

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

    const incomplete = incompleteItemLines(itemLines);
    setIncompleteIds(incomplete.map((l) => l.id));
    if (incomplete.length) {
      setError(
        `${incomplete.length === 1 ? "Hay 1 material incompleto" : `Hay ${incomplete.length} materiales incompletos`}: elige material, unidad y cantidad, o quítalo${incomplete.length === 1 ? "" : "s"}.`,
      );
      return;
    }

    try {
      const dupes = await checkDuplicateExpenses(
        workspaceId,
        amountCents,
        form.paid_at,
        form.provider_id || null,
      );
      if (dupes.length > 0) {
        showDuplicateModal(dupes);
        return;
      }
    } catch {
      // ponytail: if duplicate check fails, proceed anyway
    }

    await saveExpense();
  };

  const currSymbol = form.currency === "PEN" ? "S/" : form.currency === "USD" ? "$" : "€";

  const overallProgress =
    files.length > 0 && isPending
      ? Math.round(Object.values(uploadProgress).reduce((a, b) => a + b, 0) / files.length)
      : null;

  return (
    <FormSection title="New Expense" backUrl={`/admin/workspaces/${workspaceSlug}/expenses`}>
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
              className={`relative focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 flex flex-col items-center justify-center gap-3 border-2 border-dashed
                rounded-xl py-9 cursor-pointer transition-all duration-200
                ${dragging ? "border-purple-600 bg-cyan-50" : "border-gray-200 hover:border-purple-400 hover:bg-purple-50/40"}`}
            >
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="sr-only"
                aria-label="Adjuntar comprobante: imágenes o PDF"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dragging ? "bg-cyan-100" : "bg-gray-100"}`}
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
                  JPG, PNG, WEBP, PDF — sin límite de tamaño
                </p>
              </div>
            </label>

            {extracting && (
              <div
                role="status"
                className="flex items-center gap-2.5 bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-3"
              >
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
                  <p className="text-[11px] text-cyan-700">
                    Extrayendo monto, fechas, proveedor y materiales
                  </p>
                </div>
              </div>
            )}

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

            {!extracting && readResult && (
              <div
                role="status"
                className={`rounded-lg border px-4 py-2.5 text-xs ${
                  readResult.ok
                    ? "border-violet-200 bg-violet-50 text-violet-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {readResult.ok ? (
                  <>
                    ✦ Datos leídos de <span className="font-semibold">«{readResult.fileName}»</span>
                    . Revísalos antes de guardar.
                  </>
                ) : (
                  <>
                    No pudimos leer <span className="font-semibold">«{readResult.fileName}»</span>.
                    Completa los datos a mano; el archivo se adjuntará igual.
                  </>
                )}
              </div>
            )}

            {files.length > 0 && (
              <ul className="space-y-2 pt-1">
                {files.map((fi) => {
                  const pct = uploadProgress[fi.id] ?? null;
                  return (
                    <li
                      key={fi.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 group"
                    >
                      <div className="flex items-center gap-3">
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
                        <span className="flex-1 text-sm text-gray-700 truncate">
                          {fi.file.name}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {(fi.file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                        {pct !== null && (
                          <span className="text-xs text-cyan-600 font-medium flex-shrink-0">
                            {pct}%
                          </span>
                        )}
                        {pct === null && (
                          <button
                            type="button"
                            onClick={() => removeFile(fi.id)}
                            aria-label={`Quitar ${fi.file.name}`}
                            title={`Quitar ${fi.file.name}`}
                            className="ml-1 flex-shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors cursor-pointer"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M18 6L6 18M6 6l12 12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                      {pct !== null && (
                        <div className="mt-2 h-1 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-200"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {overallProgress !== null && (
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
                <div className="flex-1">
                  <p className="text-xs font-semibold text-cyan-700">
                    Subiendo archivos... {overallProgress}%
                  </p>
                  <div className="mt-1.5 h-1 rounded-full bg-cyan-200 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-200"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              </div>
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
                <select value={form.currency} onChange={set("currency")} className={SELECT_CLASS}>
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
              <div className="flex items-center gap-2">
                <select
                  value={form.provider_id}
                  onChange={handleProviderChange}
                  disabled={providersLoading}
                  className={SELECT_CLASS}
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
                <button
                  type="button"
                  onClick={openAddProvider}
                  aria-label="Agregar proveedor"
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
            <Field label="Situación fiscal">
              <select value={form.tax_status} onChange={set("tax_status")} className={SELECT_CLASS}>
                <option value="">Sin especificar</option>
                {(Object.keys(TAX_STATUS_LABELS) as TaxStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {TAX_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
          </section>
        </FormInnerSection>

        <SectionTitle>Detalles</SectionTitle>
        <FormInnerSection>
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoría">
                <div className="flex items-center gap-2">
                  <select
                    value={form.category_id}
                    onChange={set("category_id")}
                    disabled={catsLoading}
                    className={SELECT_CLASS}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openCategoryManager}
                    aria-label="Gestionar categorías"
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
              <Field label="Método de pago">
                <select
                  value={form.payment_method}
                  onChange={set("payment_method")}
                  className={SELECT_CLASS}
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="Etapa">
                <select value={form.stage_id} onChange={set("stage_id")} className={SELECT_CLASS}>
                  <option value="">Sin etapa</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nivel">
                <select value={form.level_id} onChange={set("level_id")} className={SELECT_CLASS}>
                  <option value="">Sin nivel</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
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

        <SectionTitle>Materiales</SectionTitle>
        <FormInnerSection>
          {totalsCheck && totalsCheck !== "ok" && itemLines.some((l) => l.ai) && (
            <TotalsCheckNotice check={totalsCheck} />
          )}
          <ExpenseItemsEditor
            highlightIds={incompleteIds}
            workspaceId={workspaceId}
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
  );
}

const TOTALS_CHECK_MESSAGES: Record<Exclude<TotalsCheck, "ok">, { tone: string; text: string }> = {
  adjusted: {
    tone: "bg-cyan-50 border-cyan-200 text-cyan-700",
    text: "Los precios de la factura venían sin IGV; se ajustaron para reflejar lo que pagaste.",
  },
  mismatch: {
    tone: "bg-amber-50 border-amber-200 text-amber-800",
    text: "Los materiales leídos no suman el total de la factura. Revisa cantidades y precios antes de guardar.",
  },
  unverified: {
    tone: "bg-amber-50 border-amber-200 text-amber-800",
    text: "No se pudo comparar los materiales con el total de la factura. Revísalos antes de guardar.",
  },
};

function TotalsCheckNotice({ check }: { check: Exclude<TotalsCheck, "ok"> }) {
  const { tone, text } = TOTALS_CHECK_MESSAGES[check];
  return <p className={`mb-3 rounded-lg border px-4 py-2.5 text-xs ${tone}`}>✦ {text}</p>;
}
