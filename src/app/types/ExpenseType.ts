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
  tax_status?: "con_igv" | "sin_igv" | "sin_comprobante" | null;
  created_at: string;
  provider?: { id: string; name: string; ruc?: string };
  category?: { id: string; name: string; color?: string; requires_guide?: boolean | null };
  expense_attachment?: { id: string; url: string; file_name: string; storage_path: string }[];
  invoice_ref?: string;
  stage?: { id: string; name: string; color?: string | null } | null;
  level?: { id: string; name: string } | null;
  /** Embedded count of material lines (expense_item(count)). */
  expense_item?: { count: number }[];
  /** Kinds of the required documents attached (factura, guía, comprobante). */
  docs?: { kind: string }[];
  /** Admin exemption from the guide rule. */
  guide_exempt_reason?: string | null;
  guide_exempt_note?: string | null;
  guide_exempt_at?: string | null;
  guide_exempt_by_user?: { email: string } | null;
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
  provider?: { id: string; name: string; ruc?: string | null } | null;
  category?: {
    id: string;
    name: string;
    color?: string | null;
    requires_guide?: boolean | null;
  } | null;
  stage?: { id: string; name: string; color?: string | null } | null;
  level?: { id: string; name: string } | null;
  expense_item?: { count: number }[];
  /** Kinds of the required documents attached (factura, guía, comprobante). */
  docs?: { kind: string }[];
  /** Admin exemption from the guide rule. */
  guide_exempt_reason?: string | null;
}
