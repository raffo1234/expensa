import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { findAccessibleWorkspaceBySlug } from "@/lib/access";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import FormSection from "@/components/FormSection";
import FormInnerSection from "@/components/FormInnerSection";
import SectionTitle from "@/components/SectionTitle";
import { Bone } from "@/components/Skeleton";
import DeleteAttachmentButton from "@/components/DeleteAttachmentButton";
import AttachmentDropArea from "@/components/AttachmentDropArea";
import { ICON_SIZE, PRIMARY_BUTTON_CLASS } from "@/constants";
import { formatAmount } from "@/utils/formatAmount";
import { formatSafeDate } from "@/lib/formatSafeDate";
import { getExpenseItems, type ExpenseItem } from "@/actions/expenses";

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
  provider: { name: string; ruc: string | null } | null;
  amount: number;
  currency: string;
  issued_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  category: { id: string; name: string; color: string | null } | null;
  created_by_user: { id: string; email: string } | null;
  expense_attachment: ExpenseAttachment[];
};

// ── Data ─────────────────────────────────────────────────────────────────────
async function fetchExpense(expenseId: string, workspaceId: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `
      id, invoice_series, invoice_number, amount, currency, issued_at, paid_at,
      provider:provider_id(name, ruc),
      payment_method, notes, created_at,
      category(id, name, color),
      created_by_user:user(id, email),
      expense_attachment(id, file_name, storage_path)
    `,
    )
    .eq("id", expenseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Expense | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const LONG_DATE = "d 'de' MMMM, yyyy";
const DEFAULT_CATEGORY_COLOR = "#7c3aed";

function isImage(storagePath: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(storagePath);
}

function invoiceRef(expense: Expense) {
  const { invoice_series: series, invoice_number: number } = expense;
  if (!series && !number) return null;
  return [series, number].filter(Boolean).join("-");
}

// Server runs in UTC; show the registration time the way users in Peru see it.
const registeredAtFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const Empty = () => <span className="text-gray-300">—</span>;

function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className={`${PRIMARY_BUTTON_CLASS} justify-center`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      Editar
    </Link>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-800 break-words">{children}</dd>
    </div>
  );
}

function FileTile({ attachment }: { attachment: ExpenseAttachment }) {
  const url = getAttachmentUrl(attachment.storage_path);
  const image = isImage(attachment.storage_path);
  const name = attachment.file_name ?? attachment.storage_path.split("/").pop();

  return (
    // The delete button sits on top of the tile, outside the link, so it never opens the file.
    <div className="relative">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={name}
        className="group block rounded-xl border border-gray-200 bg-gray-50 overflow-hidden hover:border-violet-300 hover:shadow-md transition-all"
      >
        <div className="aspect-[4/3] flex items-center justify-center bg-white border-b border-gray-100 overflow-hidden">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={name ?? "adjunto"}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <span className="w-12 h-14 rounded-md bg-rose-50 border border-rose-100 flex items-end justify-center pb-2 text-[10px] font-bold text-rose-500">
              PDF
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <p className="flex-1 min-w-0 text-xs font-medium text-gray-700 truncate">{name}</p>
          <svg
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-gray-300 group-hover:text-violet-500 flex-shrink-0 transition-colors"
            aria-hidden
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>
      </a>
      <div className="absolute top-2 right-2">
        <DeleteAttachmentButton attachmentId={attachment.id} fileName={name ?? "adjunto"} />
      </div>
    </div>
  );
}

function MaterialsTable({ items, currency }: { items: ExpenseItem[]; currency: string }) {
  const total = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  return (
    <FormInnerSection padding={false}>
      <ul className="divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {item.material.name}
                {item.brand && (
                  <span className="text-gray-400 font-normal"> · {item.brand.name}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {item.quantity} {item.unit.name}
                {item.unit_price != null && <> × {formatAmount(item.unit_price, currency)}</>}
              </p>
            </div>
            <p className="flex-shrink-0 text-sm font-semibold text-gray-700">
              {item.subtotal != null ? formatAmount(item.subtotal, currency) : "—"}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-gray-200 bg-gray-50/60 rounded-b-xl">
        <span className="text-sm font-semibold text-gray-600">Total materiales</span>
        <span className="text-sm font-bold text-gray-900">{formatAmount(total, currency)}</span>
      </div>
    </FormInnerSection>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ExpenseDetailPage({ params }: PageProps) {
  const { slug, id } = await params;
  return (
    <Suspense fallback={<ExpenseDetailFallback slug={slug} />}>
      <ExpenseDetail slug={slug} expenseId={id} />
    </Suspense>
  );
}

async function ExpenseDetail({ slug, expenseId }: { slug: string; expenseId: string }) {
  // Only users with access to the project see its expenses; others get a 404.
  const workspace = await findAccessibleWorkspaceBySlug(slug);
  if (!workspace) notFound();
  const [expense, materialItems] = await Promise.all([
    fetchExpense(expenseId, workspace.id),
    // Own access check inside; an expense from another project 404s just below.
    getExpenseItems(expenseId).catch(() => []),
  ]);
  if (!expense) notFound();

  const ref = invoiceRef(expense);
  const categoryColor = expense.category?.color ?? DEFAULT_CATEGORY_COLOR;
  const attachments = expense.expense_attachment ?? [];
  const editUrl = `/admin/workspaces/${slug}/expenses/${expense.id}/edit`;

  return (
    <FormSection
      title={expense.provider?.name ?? "Sin proveedor"}
      backUrl={`/admin/workspaces/${slug}/expenses`}
    >
      <div className="space-y-8">
        {/* Summary: what was paid, and the main action */}
        <FormInnerSection>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                {formatAmount(expense.amount, expense.currency)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {expense.category && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `${categoryColor}18`, color: categoryColor }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: categoryColor }}
                    />
                    {expense.category.name}
                  </span>
                )}
                {ref && (
                  <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-mono text-gray-600">
                    {ref}
                  </span>
                )}
              </div>
            </div>
            <EditLink href={editUrl} />
          </div>

          <dl className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5">
            <Fact label="Proveedor">
              {expense.provider?.name ?? <Empty />}
              {expense.provider?.ruc && (
                <span className="block text-xs font-normal text-gray-400 font-mono mt-0.5">
                  RUC {expense.provider.ruc}
                </span>
              )}
            </Fact>
            <Fact label="Fecha de emisión">
              {expense.issued_at ? formatSafeDate(expense.issued_at, LONG_DATE) : <Empty />}
            </Fact>
            <Fact label="Fecha de pago">
              {expense.paid_at ? formatSafeDate(expense.paid_at, LONG_DATE) : <Empty />}
            </Fact>
            <Fact label="Método de pago">{expense.payment_method ?? <Empty />}</Fact>
          </dl>
        </FormInnerSection>

        {expense.notes && (
          <section>
            <SectionTitle>Notas</SectionTitle>
            <FormInnerSection>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {expense.notes}
              </p>
            </FormInnerSection>
          </section>
        )}

        {materialItems.length > 0 && (
          <section>
            <SectionTitle>Materiales ({materialItems.length})</SectionTitle>
            <MaterialsTable items={materialItems} currency={expense.currency} />
          </section>
        )}

        {/* Editar again, closing the expense data; attachments below are managed on their own. */}
        <div className="flex justify-end">
          <EditLink href={editUrl} />
        </div>

        <section>
          <SectionTitle>Adjuntos ({attachments.length})</SectionTitle>
          {/* Drop files anywhere on the grid, or click the last tile, to add more. */}
          <AttachmentDropArea expenseId={expense.id} empty={attachments.length === 0}>
            {attachments.map((att) => (
              <FileTile key={att.id} attachment={att} />
            ))}
          </AttachmentDropArea>
        </section>

        <p className="border-t border-gray-100 pt-6 text-xs text-gray-400">
          Registrado el {registeredAtFormatter.format(new Date(expense.created_at))}
          {expense.created_by_user && <> por {expense.created_by_user.email}</>}
        </p>
      </div>
    </FormSection>
  );
}

function ExpenseDetailFallback({ slug }: { slug: string }) {
  return (
    <FormSection
      title={<Bone className="h-4.5 w-48" />}
      backUrl={`/admin/workspaces/${slug}/expenses`}
    >
      <div className="space-y-8">
        {/* Summary card: amount, chips, edit button, then four facts. */}
        <FormInnerSection>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Bone className="h-9 w-56 sm:h-10" />
              <div className="mt-3 flex gap-2">
                <Bone className="h-6 w-28 rounded-full" />
                <Bone className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Bone className="h-9.5 w-full rounded-md sm:w-24" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-gray-100 pt-5 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Bone className="h-3 w-20" />
                <Bone className="mt-2 h-4 w-28" />
              </div>
            ))}
          </div>
        </FormInnerSection>

        {/* Attachments. */}
        <section>
          <Bone className="mb-3 h-4 w-28" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-gray-200">
                <Bone className="aspect-[4/3] rounded-none" />
                <div className="px-3 py-2.5">
                  <Bone className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <Bone className="h-3 w-64" />
      </div>
    </FormSection>
  );
}
