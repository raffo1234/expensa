"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import DeleteButton from "@/components/DeleteButton";
import CategoryBadge from "@/components/CategoryBadge";
import { formatAmount } from "@/utils/formatAmount";
import FormSection from "./FormSection";

interface Expense {
  id: string;
  provider?: { name: string };
  category: string;
  payment_method?: string;
  paid_at: string;
  issued_at?: string;
  created_at: string;
  amount: number;
  currency: string;
  notes?: string;
  invoice_ref?: string;
}

interface ExpenseRowProps {
  expense: Expense;
  isLast: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  workspaceSlug: string;
}

function ExpenseRow({ expense, isLast, onDelete, isDeleting, workspaceSlug }: ExpenseRowProps) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const invoiceRef = expense.invoice_ref;

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() =>
        !isDeleting && router.push(`/admin/workspaces/${workspaceSlug}/expenses/${expense.id}`)
      }
      className={`transition-all duration-200 ${!isLast ? "border-b border-gray-100" : ""} ${
        isDeleting
          ? "opacity-40 pointer-events-none"
          : hovered
            ? "bg-purple-50 cursor-pointer"
            : "cursor-pointer"
      }`}
    >
      <td className={`${isLast ? "rounded-bl-xl" : ""} px-5 py-3.5 min-w-0 max-w-[200px]`}>
        <p className="text-sm font-semibold text-gray-900 truncate">
          {expense.provider?.name ?? (
            <span className="text-gray-400 font-normal">Sin proveedor</span>
          )}
        </p>
        {invoiceRef ? (
          <p className="text-sm text-gray-400 truncate mt-0.5 font-mono">{invoiceRef}</p>
        ) : expense.notes ? (
          <p className="text-xs text-gray-400 truncate mt-0.5">{expense.notes}</p>
        ) : null}
      </td>

      <td className="px-5 py-3.5">
        <CategoryBadge category={expense.category} />
      </td>

      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
        {expense.payment_method ?? "—"}
      </td>

      <td className="px-5 py-3.5 text-right">
        <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
          {format(new Date(expense.paid_at), "d MMM yyyy", { locale: es })}
        </p>
        {expense.issued_at && expense.issued_at !== expense.paid_at ? (
          <p className="text-sm text-gray-400 whitespace-nowrap">
            emitido {format(new Date(expense.issued_at), "d MMM", { locale: es })}
          </p>
        ) : (
          <p className="text-sm text-gray-400 whitespace-nowrap">
            {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true, locale: es })}
          </p>
        )}
      </td>

      <td className="px-5 py-3.5 text-sm font-bold text-gray-900 whitespace-nowrap text-right">
        {formatAmount(expense.amount, expense.currency)}
      </td>

      <td
        className={`px-5 py-3.5 ${isLast ? "rounded-br-xl" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <DeleteButton
          onClick={() => onDelete(expense.id)}
          isDeleting={isDeleting}
          title="Eliminar gasto"
          confirmTitle="¿Eliminar gasto?"
          confirmDescription={`Se eliminará "${expense.provider?.name ?? "este gasto"}" de forma permanente.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
        />
      </td>
    </tr>
  );
}

interface ExpenseTableProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  deletingId?: string | null;
  workspaceSlug: string;
  maxHeight?: string;
}

export default function ExpenseTable({
  expenses = [],
  onDelete,
  deletingId,
  workspaceSlug,
  maxHeight = "600px",
}: ExpenseTableProps) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight }}>
      <FormSection padding={false}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 border-b border-gray-100">
            <tr>
              {["Proveedor", "Categoría", "Método", "Fecha", "Monto", ""].map((h) => (
                <th
                  key={h}
                  className={`px-5 py-3 font-semibold text-gray-700 ${
                    h === "Fecha" || h === "Monto" ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  No hay gastos registrados.
                </td>
              </tr>
            ) : (
              expenses.map((expense, i) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  isLast={i === expenses.length - 1}
                  onDelete={onDelete}
                  isDeleting={deletingId === expense.id}
                  workspaceSlug={workspaceSlug}
                />
              ))
            )}
          </tbody>
        </table>
      </FormSection>
    </div>
  );
}
