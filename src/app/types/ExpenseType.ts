export interface Expense {
  id: string;
  invoice_series?: string;
  invoice_number?: string;
  amount?: number;
  currency?: string;
  issued_at?: string;
  paid_at?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  provider?: { id: string; name: string };
  category?: { id: string; name: string; color?: string };
  expense_attachment?: { id: string; url: string; file_name: string; storage_path: string }[];
  invoice_ref?: string;
  stage?: { id: string; name: string; color?: string | null } | null;
  level?: { id: string; name: string } | null;
}

export interface ExpenseRow {
  id: string;
  invoice_series?: string | null;
  invoice_number?: string | null;
  amount: number;
  invoice_ref?: string;
  currency: string;
  issued_at?: string | null;
  paid_at: string;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
  provider?: { id: string; name: string } | null;
  category?: { id: string; name: string; color?: string | null } | null;
  stage?: { id: string; name: string; color?: string | null } | null;
  level?: { id: string; name: string } | null;
}
