"use client";

import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import FormSection from "@/components/FormSection";
import FormInnerSection from "@/components/FormInnerSection";

// ── Types ────────────────────────────────────────────────────────────────────
type ExpenseAttachment = {
  id: string;
  file_name: string | null;
  storage_path: string;
};

type Expense = {
  id: string;
  provider: {
    name: string;
  } | null;
  amount: number;
  currency: string;
  paid_at: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  category: { id: string; name: string; color: string | null } | null;
  created_by_user: { id: string; email: string } | null;
  expense_attachment: ExpenseAttachment[];
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchExpense(expenseId: string): Promise<Expense> {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `
      id, amount, currency, paid_at,
      provider:provider_id(name),
      payment_method, notes, created_at,
      category(id, name, color),
      user:user(id, email),
      expense_attachment(id, file_name, storage_path)
    `,
    )
    .eq("id", expenseId)
    .single();
  if (error) throw error;
  return data as unknown as Expense;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", EUR: "€" };

function formatAmount(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  return `${sym} ${(amount / 100).toFixed(2)}`;
}

function isImage(storagePath: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(storagePath);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-widest flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900 text-right font-medium">{children}</span>
    </div>
  );
}

function FilePreview({ attachment }: { attachment: ExpenseAttachment }) {
  const url = getAttachmentUrl(attachment.storage_path);
  const image = isImage(attachment.storage_path);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3
                 hover:border-cyan-300 hover:bg-cyan-50/40 transition-all"
    >
      {image ? (
        <img
          src={url}
          alt={attachment.file_name ?? "adjunto"}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-cyan-600">PDF</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {attachment.file_name ?? attachment.storage_path.split("/").pop()}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{image ? "Imagen" : "PDF"}</p>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-gray-300 group-hover:text-cyan-500 flex-shrink-0 transition-colors"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExpenseDetailPage() {
  const params = useParams();
  const workspaceSlug = params.slug as string;
  const expenseId = params.id as string;
  const router = useRouter();

  const {
    data: expense,
    isLoading,
    error,
  } = useSWR(expenseId ? ["expense", expenseId] : null, ([, id]) => fetchExpense(id));

  console.log({ error });

  const categoryColor = expense?.category?.color ?? "#06b6d4";

  return (
    <div className="min-h-screen text-gray-900">
      {/* Nav */}
      <nav className=" top-0 z-10">
        <div className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => router.push(`/admin/workspace/${workspaceSlug}/expenses`)}
              className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50"
            >
              Gastos
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium px-2 py-1 truncate max-w-[160px]">
              {isLoading ? "..." : (expense?.provider?.name ?? "Sin proveedor")}
            </span>
          </div>
          <button
            onClick={() => router.push(`/admin/workspace/${workspaceSlug}/expenses`)}
            className="text-sm px-2 py-1"
          >
            ← Volver
          </button>
        </div>
      </nav>
      <FormSection>
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
          <div className="flex items-center gap-3 border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600">
            No se pudo cargar el gasto. Intenta recargar la página.
          </div>
        )}

        {expense && (
          <div className="space-y-8">
            {/* Amount hero */}
            <FormInnerSection>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Monto
                  </p>
                  <p className="text-4xl font-bold tracking-tight" style={{ color: "#06b6d4" }}>
                    {formatAmount(expense.amount, expense.currency)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {format(new Date(expense.paid_at), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
                {expense.category && (
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0"
                    style={{ background: `${categoryColor}18`, color: categoryColor }}
                  >
                    {expense.category.name}
                  </span>
                )}
              </div>
            </FormInnerSection>

            {/* Details */}
            <FormInnerSection>
              <h2 className="text-xs font-bold text-cyan-600 uppercase tracking-widest pb-1">
                Detalles
              </h2>
              <DetailRow label="Proveedor">
                {expense.provider?.name ?? <span className="text-gray-400">—</span>}
              </DetailRow>
              <DetailRow label="Moneda">{expense.currency}</DetailRow>
              <DetailRow label="Método de pago">
                {expense.payment_method ?? <span className="text-gray-400">—</span>}
              </DetailRow>
              <DetailRow label="Fecha de pago">
                {format(new Date(expense.paid_at), "d MMM yyyy", { locale: es })}
              </DetailRow>
              <DetailRow label="Registrado">
                {expense.created_at
                  ? format(new Date(expense.created_at), "d MMM yyyy · HH:mm", { locale: es })
                  : "—"}
              </DetailRow>
              {expense.created_by_user && (
                <DetailRow label="Creado por">{expense.created_by_user.email}</DetailRow>
              )}
              {expense.notes && (
                <DetailRow label="Notas">
                  <span className="text-gray-700 whitespace-pre-wrap text-right">
                    {expense.notes}
                  </span>
                </DetailRow>
              )}
            </FormInnerSection>

            {/* Attachments */}
            {(expense.expense_attachment ?? []).length > 0 && (
              <FormInnerSection>
                <section className="space-y-4">
                  <h2 className="text-[11px] font-bold text-cyan-600 uppercase tracking-widest">
                    Adjuntos ({expense.expense_attachment.length})
                  </h2>
                  {expense.expense_attachment.map((att) => (
                    <FilePreview key={att.id} attachment={att} />
                  ))}
                </section>
              </FormInnerSection>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => router.push(`/admin/workspace/${workspaceSlug}/expenses`)}
                className="flex-1 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium
                           text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              >
                ← Volver a gastos
              </button>
              <button
                onClick={() =>
                  router.push(`/admin/workspace/${workspaceSlug}/expenses/${expense.id}/edit`)
                }
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                  boxShadow: "0 2px 8px rgba(6,182,212,0.25)",
                }}
              >
                Editar
              </button>
            </div>
          </div>
        )}
      </FormSection>
    </div>
  );
}
