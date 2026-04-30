"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseISO, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import DeleteButton from "@/components/DeleteButton";
import CategoryBadge from "@/components/CategoryBadge";
import { formatAmount } from "@/utils/formatAmount";
import FormSection from "./FormSection";
import { Expense } from "@/types/ExpenseType";

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

  const parsedDate = expense?.issued_at ? parseISO(expense.issued_at) : null;

  const label = parsedDate
    ? new Intl.DateTimeFormat("es-PE", {
        day: "numeric",
        month: "short",
        timeZone: "America/Lima",
      }).format(parsedDate)
    : "-";

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
        <CategoryBadge category={expense.category?.name} />
      </td>

      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
        {expense.payment_method ?? "—"}
      </td>

      <td className="px-5 py-3.5 text-right">
        <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{label}</p>
        <p className="text-sm text-gray-400 whitespace-nowrap">
          {parsedDate ? formatDistanceToNow(parsedDate, { addSuffix: true, locale: es }) : "-"}
        </p>
      </td>

      <td className="px-5 py-3.5 text-sm font-bold text-gray-900 whitespace-nowrap text-right">
        {expense.amount ? formatAmount(expense.amount, expense.currency) : "—"}
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
    <FormSection padding={false}>
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse">
          <thead className="border-b border-gray-100">
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
      </div>
    </FormSection>
  );
}
