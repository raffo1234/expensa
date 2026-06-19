import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import FormSection from "@/components/FormSection";
import FormInnerSection from "@/components/FormInnerSection";
import SectionTitle from "@/components/SectionTitle";
import { formatAmount } from "@/utils/formatAmount";
import { formatSafeDate } from "@/lib/formatSafeDate";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import { notFound } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";

type Params = Promise<{ id: string }>;

type Attachment = { id: string; file_name: string | null; storage_path: string };
type Expense = {
  id: string;
  invoice_series: string | null;
  invoice_number: string | null;
  amount: number;
  currency: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  provider: { id: string; name: string; ruc: string | null } | null;
  category: { id: string; name: string; color: string | null } | null;
  expense_attachment: Attachment[];
};

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

function FilePreview({ attachment }: { attachment: Attachment }) {
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
      <Icon
        icon="solar:arrow-right-up-linear"
        className="text-gray-300 group-hover:text-cyan-500 flex-shrink-0 transition-colors"
        fontSize={16}
      />
    </a>
  );
}

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  if (!id) return notFound();

  const user = await getCurrentUser();
  if (!user || !user.roleId) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.VIEW_EXPENSES_SUMMARY]);
  if (!permissions[Permissions.VIEW_EXPENSES_SUMMARY]) return <NoAccess />;

  const { data, error } = await supabase
    .from("expense")
    .select(
      `id, invoice_series, invoice_number, amount, currency, paid_at, payment_method, notes,
       provider:provider_id(id, name, ruc),
       category:category_id(id, name, color),
       expense_attachment(id, file_name, storage_path)`,
    )
    .eq("id", id)
    .single();

  if (error || !data) return notFound();

  const expense = data as unknown as Expense;
  const categoryColor = expense.category?.color ?? "#06b6d4";

  return (
    <FormSection title="Expense detail" backUrl="/admin/summary">
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

        {/* Details */}
        <SectionTitle>Detalles</SectionTitle>
        <FormInnerSection padding={false}>
          {expense.invoice_series && (
            <DetailRow label="Serie">{expense.invoice_series}</DetailRow>
          )}
          {expense.invoice_number && (
            <DetailRow label="Número">{expense.invoice_number}</DetailRow>
          )}
          <DetailRow label="Proveedor">
            {expense.provider?.name ?? <span className="text-gray-400">—</span>}
            {expense.provider?.ruc && (
              <span className="block text-gray-400">{expense.provider.ruc}</span>
            )}
          </DetailRow>
          <DetailRow label="Moneda">{expense.currency}</DetailRow>
          <DetailRow label="Método de pago">
            {expense.payment_method ?? <span className="text-gray-400">—</span>}
          </DetailRow>
          <DetailRow label="Fecha de pago">
            {formatSafeDate(expense.paid_at, "d 'de' MMMM, yyyy")}
          </DetailRow>
          {expense.notes && (
            <DetailRow label="Notas">
              <span className="whitespace-pre-wrap text-right">{expense.notes}</span>
            </DetailRow>
          )}
        </FormInnerSection>

        {/* Attachments */}
        {expense.expense_attachment.length > 0 && (
          <>
            <SectionTitle>Adjuntos ({expense.expense_attachment.length})</SectionTitle>
            <FormInnerSection>
              <div className="space-y-4">
                {expense.expense_attachment.map((att) => (
                  <FilePreview key={att.id} attachment={att} />
                ))}
              </div>
            </FormInnerSection>
          </>
        )}
      </div>
    </FormSection>
  );
}
