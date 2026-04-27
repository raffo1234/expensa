"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { uploadToR2 } from "@/lib/r2";
import { supabase } from "@/lib/supabase";

export type CreateExpenseInput = {
  workspace_id: string;
  category_id?: string;
  provider?: string;
  amount: number; // en céntimos / entero
  currency: string;
  paid_at: string; // ISO date
  payment_method?: string;
  notes?: string;
  files: { name: string; type: string; buffer: number[] }[];
};

export async function createExpense(input: CreateExpenseInput) {
  const user = await getCurrentUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Insert expense
  const { data: expense, error: expenseError } = await supabase
    .from("expense")
    .insert({
      workspace_id: input.workspace_id,
      category_id: input.category_id || null,
      provider: input.provider || null,
      amount: input.amount,
      currency: input.currency,
      paid_at: input.paid_at,
      payment_method: input.payment_method || null,
      notes: input.notes || null,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (expenseError || !expense) {
    return { error: expenseError?.message ?? "Failed to create expense" };
  }

  // 2. Upload attachments to R2 + insert expense_attachment rows
  if (input.files.length > 0) {
    for (const file of input.files) {
      const ext = file.name.split(".").pop();
      const key = `${input.workspace_id}/${expense.id}/${randomUUID()}.${ext}`;
      const buffer = Buffer.from(file.buffer);

      try {
        await uploadToR2(key, buffer, file.type);
      } catch (err: any) {
        return { error: `R2 upload failed: ${err.message}` };
      }

      const { error: attachError } = await supabase.from("expense_attachment").insert({
        expense_id: expense.id,
        storage_path: key,
        file_name: file.name,
      });

      if (attachError) {
        return { error: attachError.message };
      }
    }
  }

  revalidatePath(`/workspaces/${input.workspace_id}/expenses`);
  return { data: expense };
}
