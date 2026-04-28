"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { revalidatePath } from "next/cache";
import { uploadToR2 } from "@/lib/r2";

type SerializedFile = {
  name: string;
  type: string;
  buffer: number[];
};

type CreateExpenseInput = {
  workspace_id: string;
  workspace_slug: string;
  category_id?: string;

  // 🔥 FIX: renombrar correctamente
  provider_id?: string;

  amount: number;
  currency: string;
  paid_at: string;
  payment_method?: string;
  notes?: string;
  files: SerializedFile[];
};

export async function createExpense(input: CreateExpenseInput): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  // 1. Insert expense
  const { data: expense, error: expenseError } = await supabaseAdmin
    .from("expense")
    .insert({
      workspace_id: input.workspace_id,
      category_id: input.category_id ?? null,

      // 🔥 FIX CLAVE
      provider_id: input.provider_id ?? null,

      amount: input.amount,
      currency: input.currency,
      paid_at: input.paid_at,
      payment_method: input.payment_method ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (expenseError) return { error: expenseError.message };

  // 2. Upload files to R2 + insert expense_attachment rows
  for (const file of input.files) {
    const ext = file.name.split(".").pop();
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${input.workspace_slug}/${expense.id}/${uniqueName}`;

    await uploadToR2(storagePath, Buffer.from(file.buffer), file.type);

    await supabaseAdmin.from("expense_attachment").insert({
      expense_id: expense.id,
      storage_path: storagePath,
      file_name: file.name,
    });
  }

  revalidatePath(`/admin/workspace/${input.workspace_slug}/expenses`);
  return {};
}
