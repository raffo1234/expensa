"use client";

import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import FormSection from "@/components/FormSection";
import FormInnerSection from "@/components/FormInnerSection";
import SectionTitle from "@/components/SectionTitle";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/constants";
import Link from "next/link";
import { formatAmount } from "@/utils/formatAmount";
import BackLink from "@/components/BackLink";
import TitleWrapper from "@/components/TitleWrapper";
import PageTitle from "@/components/PageTitle";
import { formatSafeDate } from "@/lib/formatSafeDate";

// ── Types ────────────────────────────────────────────────────────────────────
type ExpenseAttachment = {
  id: string;
  file_name: string | null;
  storage_path: string;
};

type Expense = {
  id: string;
  invoice_series: string | null;
  invoice_number: string | null;
  provider: {
    name: string;
    ruc: string;
  } | null;
  amount: number;
  currency: string;
  issued_at: string;
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
      id, invoice_series, invoice_number, amount, currency, issued_at, paid_at,
      provider:provider_id(name, ruc),
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

function isImage(storagePath: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(storagePath);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="first:rounded-t-xl odd:bg-slate-50 flex items-start justify-between p-5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-widest flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-500 text-right font-medium">{children}</span>
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

  const categoryColor = expense?.category?.color ?? "#06b6d4";

  return (
    <div>
      <BackLink href={`/admin/workspaces/${workspaceSlug}/expenses`}>Volver</BackLink>
      <TitleWrapper>
        <PageTitle>
          <Link href={`/admin/workspaces/${workspaceSlug}/expenses`} className="text-gray-500">
            Gastos{" "}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium px-2 py-1 truncate max-w-[160px]">
            {isLoading ? "..." : (expense?.provider?.name ?? "Sin proveedor")}
          </span>
        </PageTitle>
      </TitleWrapper>

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
            <SectionTitle>Monto</SectionTitle>
            <FormInnerSection>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-4xl font-bold tracking-tight" style={{ color: "#06b6d4" }}>
                    {formatAmount(expense.amount, expense.currency)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Pagado: {formatSafeDate(expense.paid_at, "d 'de' MMMM, yyyy")}
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

            <SectionTitle>Detalles</SectionTitle>
            <FormInnerSection padding={false}>
              <DetailRow label="Referencia">
                {expense.invoice_series || expense.invoice_number ? (
                  <span className="font-mono">
                    {expense.invoice_series}{expense.invoice_series && expense.invoice_number ? "-" : ""}{expense.invoice_number}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </DetailRow>
              <DetailRow label="Proveedor">
                {expense.provider?.name ?? <span className="text-gray-400">—</span>} <br />
                <span className="text-gray-600 text-lg">{expense.provider?.ruc}</span>
              </DetailRow>
              <DetailRow label="Moneda">{expense.currency}</DetailRow>
              <DetailRow label="Método de pago">
                {expense.payment_method ?? <span className="text-gray-400">—</span>}
              </DetailRow>
              <DetailRow label="Fecha de emision">
                {formatSafeDate(expense.issued_at, "d 'de' MMMM, yyyy")}
              </DetailRow>
              <DetailRow label="Fecha de pago">
                {formatSafeDate(expense.paid_at, "d 'de' MMMM, yyyy")}
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
                  <span className="text-gray-500 whitespace-pre-wrap text-right">
                    {expense.notes}
                  </span>
                </DetailRow>
              )}
            </FormInnerSection>

            <SectionTitle>Adjuntos ({expense.expense_attachment.length})</SectionTitle>
            {(expense.expense_attachment ?? []).length > 0 && (
              <FormInnerSection>
                <section className="space-y-4">
                  {expense.expense_attachment.map((att) => (
                    <FilePreview key={att.id} attachment={att} />
                  ))}
                </section>
              </FormInnerSection>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Link
                href={`/admin/workspaces/${workspaceSlug}/expenses`}
                className={SECONDARY_BUTTON_CLASS}
              >
                ← Volver a gastos
              </Link>
              <button
                onClick={() =>
                  router.push(`/admin/workspaces/${workspaceSlug}/expenses/${expense.id}/edit`)
                }
                className={PRIMARY_BUTTON_CLASS}
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
