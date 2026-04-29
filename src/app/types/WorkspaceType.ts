import { Expense } from "./ExpenseType";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  expense?: Expense[];
};
