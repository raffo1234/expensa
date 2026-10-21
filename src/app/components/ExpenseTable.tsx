"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import DeleteButton from "@/components/DeleteButton";
import CategoryBadge from "@/components/CategoryBadge";
import { formatAmount } from "@/utils/formatAmount";
import { ICON_SIZE } from "@/constants";
import { Expense } from "@/types/ExpenseType";
import { formatSafeDate } from "@/lib/formatSafeDate";
import DataTable, {
  DataTableRow,
  ROW_CONTROL,
  RowLink,
  Td,
  type DataTableColumn,
} from "./DataTable";

const COLUMNS: DataTableColumn[] = [
  { label: "Factura" },
  { label: "Proveedor" },
  { label: "Categoría" },
  { label: "Método" },
  { label: "Fecha de emisión" },
  { label: "Monto", align: "right" },
  { label: "Materiales", align: "center" },
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
        const href = `/admin/workspaces/${workspaceSlug}/expenses/${expense.id}`;
        const isDeleting = deletingId === expense.id;
        const providerName = expense.provider?.name;

        const issuedDate = expense.issued_at
          ? new Date(expense.issued_at.slice(0, 10) + "T12:00:00")
          : null;

        return (
          <DataTableRow
            key={expense.id}
            href={href}
            className={isDeleting ? "pointer-events-none opacity-40" : ""}
          >
            <Td className="font-mono">
              <RowLink href={href}>
                {expense.invoice_ref ?? "—"}
                <span className="sr-only">
                  {" "}
                  — ver gasto{providerName ? ` de ${providerName}` : ""}
                </span>
              </RowLink>
            </Td>

            <Td>
              <span
                className="block max-w-56 truncate"
                title={expense.provider?.ruc ? `RUC ${expense.provider.ruc}` : undefined}
              >
                {providerName ?? "Sin proveedor"}
              </span>
            </Td>

            <Td>
              <CategoryBadge category={expense.category?.name} color={expense.category?.color} />
            </Td>

            <Td>{expense.payment_method ?? "—"}</Td>

            <Td>
              <span
                title={
                  issuedDate
                    ? formatDistanceToNow(issuedDate, { addSuffix: true, locale: es })
                    : undefined
                }
              >
                {expense.issued_at ? formatSafeDate(expense.issued_at, "d MMM yyyy") : "—"}
              </span>
            </Td>

            <Td align="right" className="font-book text-navy-900 tabular-nums">
              {expense.amount ? formatAmount(expense.amount, expense.currency) : "—"}
            </Td>

            <Td align="center">
              {materialExpenseIds?.has(expense.id) ? (
                <span
                  title="Tiene materiales registrados"
                  className={`${ROW_CONTROL} inline-flex aspect-square items-center justify-center rounded-full bg-violet-100 text-violet-600`}
                >
                  <svg
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <span className="sr-only">Tiene materiales</span>
                </span>
              ) : (
                "—"
              )}
            </Td>

            <Td align="right">
              <DeleteButton
                onClick={() => onDelete(expense.id)}
                isDeleting={isDeleting}
                title="Eliminar gasto"
                confirmTitle="¿Eliminar gasto?"
                confirmDescription={`Se eliminará "${providerName ?? "este gasto"}" de forma permanente.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
              />
            </Td>
          </DataTableRow>
        );
      })}
    </DataTable>
  );
}
