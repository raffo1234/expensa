"use client";

import ExpenseTable from "@/components/ExpenseTable";
import { supabase } from "@/lib/supabase";
import { use } from "react";
import useSWR from "swr";

interface ExpensesPageProps {
  params: Promise<{ slug: string }>;
}

interface Provider {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  invoice_series?: string;
  invoice_number?: string;
  invoice_ref?: string;
  amount: number;
  currency: string;
  issued_at?: string;
  paid_at: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  provider?: Provider;
  category: string;
}

interface ExpenseRow {
  id: string;
  invoice_series?: string | null;
  invoice_number?: string | null;
  amount: number;
  currency: string;
  issued_at?: string | null;
  paid_at: string;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
  provider?: { id: string; name: string } | null;
  category?: { id: string; name: string; color?: string | null } | null;
}

interface Workspace {
  id: string;
  name: string;
}

async function fetchWorkspace(slug: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspace")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (error || !data) throw error;
  return data as Workspace;
}

async function fetchExpenses(workspaceId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `
      id, invoice_series, invoice_number, amount, currency,
      issued_at, paid_at, payment_method, notes, created_at,
      provider:provider_id(id, name),
      category:category_id(id, name, color)
    `,
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
    category: row.category?.name ?? "other",
  })) as Expense[];
}

async function deleteExpense(id: string) {
  const { error } = await supabase.from("expense").delete().eq("id", id);
  if (error) throw error;
}

export default function ExpensesPage({ params }: ExpensesPageProps) {
  const { slug } = use(params);

  const { data: workspace } = useSWR(["workspace", slug], () => fetchWorkspace(slug));

  const {
    data: expenses,
    isLoading,
    error,
    mutate,
  } = useSWR(workspace ? ["expenses", workspace.id] : null, () => fetchExpenses(workspace!.id));

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Cargando gastos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-400">Error al cargar los gastos.</p>
      </div>
    );
  }

  return (
    <>
      <div className="py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Gastos
          {workspace?.name && (
            <span className="text-gray-400 font-normal ml-2">— {workspace.name}</span>
          )}
        </h1>
        <span className="text-sm text-gray-400">
          {expenses?.length ?? 0} registro{expenses?.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ExpenseTable
        expenses={expenses ?? []}
        onDelete={handleDelete}
        workspaceSlug={slug}
        maxHeight="calc(100vh - 180px)"
      />
    </>
  );
}
