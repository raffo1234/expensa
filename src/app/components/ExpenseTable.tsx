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
  { label: "Materiales", className: "text-center" },
  { label: "" },
];

interface ExpenseTableProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  deletingId?: string | null;
  workspaceSlug: string;
  materialExpenseIds?: Set<string>;
}

export default function ExpenseTable({
  expenses = [],
  onDelete,
  deletingId,
  workspaceSlug,
  materialExpenseIds,
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

            <td className="text-center">
              <Link href={href} className="flex items-center justify-center p-6">
                {materialExpenseIds?.has(expense.id) ? (
                  <span
                    title="Tiene materiales registrados"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-cyan-100 text-cyan-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </span>
                ) : (
                  <span className="text-sm text-gray-300">—</span>
                )}
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
