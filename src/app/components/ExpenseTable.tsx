"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import DeleteButton from "@/components/DeleteButton";
import CategoryBadge from "@/components/CategoryBadge";
import { formatAmount } from "@/utils/formatAmount";
import { Expense } from "@/types/ExpenseType";
import { formatSafeDate } from "@/lib/formatSafeDate";
import DataTable, { DataTableRow } from "./DataTable";

const COLUMNS = [
  { label: "Ref." },
  { label: "Proveedor" },
  { label: "Categoría" },
  { label: "Método" },
  { label: "Fecha de emision", className: "text-right" },
  { label: "Monto", className: "text-right" },
  { label: "" },
];

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
    <DataTable
      columns={COLUMNS}
      isEmpty={expenses.length === 0}
      emptyMessage="No hay gastos registrados."
    >
      {expenses.map((expense) => {
        const invoiceRef = expense.invoice_ref;
        const href = `/admin/workspaces/${workspaceSlug}/expenses/${expense.id}`;
        const isDeleting = deletingId === expense.id;

        const parsedDate = expense?.issued_at
          ? new Date(expense.issued_at.slice(0, 10) + "T12:00:00")
          : null;

        return (
          <DataTableRow
            key={expense.id}
            className={isDeleting ? "opacity-40 pointer-events-none" : ""}
          >
            <td>
              <Link href={href} className="block p-6">
                {invoiceRef ? (
                  <p className="text-sm text-gray-600 font-mono whitespace-nowrap">{invoiceRef}</p>
                ) : (
                  <span className="text-sm text-gray-300">—</span>
                )}
              </Link>
            </td>

            <td className="min-w-0 max-w-[200px]">
              <Link href={href} className="block p-6">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {expense.provider?.name ?? (
                    <span className="text-gray-400 font-normal">Sin proveedor</span>
                  )}
                </p>
                {expense.provider?.ruc && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">{expense.provider.ruc}</p>
                )}
              </Link>
            </td>

            <td>
              <Link href={href} className="block p-6">
                <CategoryBadge category={expense.category?.name} />
              </Link>
            </td>

            <td className="text-sm text-gray-500 whitespace-nowrap">
              <Link href={href} className="block p-6">
                {expense.payment_method ?? "—"}
              </Link>
            </td>

            <td className="text-right">
              <Link href={href} className="block p-6">
                <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
                  {expense.issued_at ? formatSafeDate(expense.issued_at, "d 'de' MMMM, yyyy") : "-"}
                </p>
                <p className="text-sm text-gray-400 whitespace-nowrap">
                  {parsedDate ? formatDistanceToNow(parsedDate, { addSuffix: true, locale: es }) : "-"}
                </p>
              </Link>
            </td>

            <td className="text-sm font-bold text-gray-900 whitespace-nowrap text-right">
              <Link href={href} className="block p-6">
                {expense.amount ? formatAmount(expense.amount, expense.currency) : "—"}
              </Link>
            </td>

            <td className="p-6">
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
          </DataTableRow>
        );
      })}
    </DataTable>
  );
}
