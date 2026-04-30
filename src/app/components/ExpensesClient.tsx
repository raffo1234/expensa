"use client";

import ExpenseTable from "@/components/ExpenseTable";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import { PRIMARY_BUTTON_CLASS } from "@/constants";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import { Expense, ExpenseRow } from "@/types/ExpenseType";
import { Workspace } from "@/types/WorkspaceType";
import { deleteExpense } from "@/actions/expenses";
import { useState } from "react";
import TitleWrapper from "./TitleWrapper";
import PageTitle from "./PageTitle";

interface Props {
  slug: string;
  workspace: Workspace;
  initialExpenses: Expense[];
}

const fetchExpenses = async (workspaceId: string): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `id, invoice_series, invoice_number, amount, currency,
       issued_at, paid_at, payment_method, notes, created_at,
       provider:provider_id(id, name),
       category:category_id(id, name, color)`,
    )
    .eq("workspace_id", workspaceId)
    .order("paid_at", { ascending: false });

  if (error) throw error;

  return ((data as unknown as ExpenseRow[]) ?? []).map((row) => ({
    ...row,
    invoice_ref:
      row.invoice_series && row.invoice_number
        ? `${row.invoice_series}-${row.invoice_number}`
        : undefined,
    invoice_series: row.invoice_series ?? undefined,
    invoice_number: row.invoice_number ?? undefined,
    issued_at: row.issued_at ?? undefined,
    payment_method: row.payment_method ?? undefined,
    notes: row.notes ?? undefined,
    provider: row.provider ?? undefined,
    category: row.category
      ? { ...row.category, color: row.category.color ?? undefined }
      : { id: "other", name: "other" },
  }));
};

export default function ExpensesClient({ slug, workspace, initialExpenses }: Props) {
  const {
    data: expenses,
    error,
    mutate,
  } = useSWR(["expenses", workspace.id], () => fetchExpenses(workspace.id), {
    fallbackData: initialExpenses,
    revalidateOnMount: false,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const snapshot = expenses;
    setDeletingId(id);
    try {
      await deleteExpense(id, slug);
      mutate((prev) => prev?.filter((e) => e.id !== id), { revalidate: false });
    } catch {
      mutate(snapshot, { revalidate: false });
    } finally {
      setDeletingId(null);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-400">Error al cargar los gastos.</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <BackLink href="/admin/workspaces">Workspaces</BackLink>
        <TitleWrapper>
          <PageTitle>
            Gastos
            <span className="text-gray-400 font-normal ml-2">— {workspace.name}</span>
          </PageTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {expenses?.length ?? 0} registro{expenses?.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Link
            href={`/admin/workspaces/${slug}/upload-expense`}
            className={` ${PRIMARY_BUTTON_CLASS} mt-8`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5v14" />
            </svg>
            Agregar
          </Link>
        </TitleWrapper>
      </div>
      <ExpenseTable
        expenses={expenses ?? []}
        onDelete={handleDelete}
        deletingId={deletingId}
        workspaceSlug={slug}
        maxHeight="calc(100vh - 180px)"
      />
    </>
  );
}
