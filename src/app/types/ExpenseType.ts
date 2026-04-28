import { Category } from "./CategoryType";
import { ExpenseAttachment } from "./ExpenseAttachment";

export type Expense = {
  id: string;
  provider: { name: string } | null;
  amount: number;
  currency: string;
  paid_at: string;
  payment_method: string | null;
  notes: string | null;
  category: Category | null;
  expense_attachment: ExpenseAttachment[];
};
