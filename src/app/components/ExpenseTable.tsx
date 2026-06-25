"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import DeleteButton from "@/components/DeleteButton";
import CategoryBadge from "@/components/CategoryBadge";
import { formatAmount } from "@/utils/formatAmount";
import FormSection from "./FormSection";
import { Expense } from "@/types/ExpenseType";
import { formatSafeDate } from "@/lib/formatSafeDate";

interface ExpenseRowProps {
  expense: Expense;
  isLast: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  workspaceSlug: string;
}

function ExpenseRow({ expense, isLast, onDelete, isDeleting, workspaceSlug }: ExpenseRowProps) {
  const invoiceRef = expense.invoice_ref;
  const href = `/admin/workspaces/${workspaceSlug}/expenses/${expense.id}`;

  const parsedDate = expense?.issued_at
    ? new Date(expense.issued_at.slice(0, 10) + "T12:00:00")
    : null;
  return (
    <tr
      className={`transition-all duration-200 ${!isLast ? "border-b border-gray-100" : ""} ${
        isDeleting ? "opacity-40 pointer-events-none" : "hover:bg-purple-50"
      }`}
    >
      <td className={`${isLast ? "rounded-bl-xl" : ""}`}>
        <Link href={href} className="block p-5">
          {invoiceRef ? (
            <p className="text-sm text-gray-600 font-mono whitespace-nowrap">{invoiceRef}</p>
          ) : (
            <span className="text-sm text-gray-300">—</span>
          )}
        </Link>
      </td>

      <td className="min-w-0 max-w-[200px]">
        <Link href={href} className="block p-5">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {expense.provider?.name ?? (
              <span className="text-gray-400 font-normal">Sin proveedor</span>
            )}
          </p>
          {expense.notes && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{expense.notes}</p>
          )}
        </Link>
      </td>

      <td>
        <Link href={href} className="block p-5">
          <CategoryBadge category={expense.category?.name} />
        </Link>
      </td>

      <td className="text-sm text-gray-500 whitespace-nowrap">
        <Link href={href} className="block p-5">
          {expense.payment_method ?? "—"}
        </Link>
      </td>

      <td className="text-right">
        <Link href={href} className="block p-5">
          <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
            {expense.issued_at ? formatSafeDate(expense.issued_at, "d 'de' MMMM, yyyy") : "-"}
          </p>
          <p className="text-sm text-gray-400 whitespace-nowrap">
            {parsedDate ? formatDistanceToNow(parsedDate, { addSuffix: true, locale: es }) : "-"}
          </p>
        </Link>
      </td>


      <td className="text-sm font-bold text-gray-900 whitespace-nowrap text-right">
        <Link href={href} className="block p-5">
          {expense.amount ? formatAmount(expense.amount, expense.currency) : "—"}
        </Link>
      </td>

      <td className={`p-5 ${isLast ? "rounded-br-xl" : ""}`}>
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
}

export default function ExpenseTable({
  expenses = [],
  onDelete,
  deletingId,
  workspaceSlug,
}: ExpenseTableProps) {
  return (
    <FormSection padding={false}>
      <div className="overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="border-b border-gray-100">
            <tr>
              {[
                "Ref.",
                "Proveedor",
                "Categoría",
                "Método",
                "Fecha de emision",
                "Monto",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className={`p-5 font-medium text-gray-600 ${
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
      </div>
    </FormSection>
  );
}
