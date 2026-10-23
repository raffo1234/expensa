import { Expense } from "./ExpenseType";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  created_by?: string;
  /** expense(count) embed: one row with the number of expenses. */
  expense_count?: { count: number }[];
  expense?: Expense[];
};
