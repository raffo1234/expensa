// Columns for the expenses list, shared by the page's first render and the
// listExpenses action so both return the same shape.
// expense_item(count) tells the table which rows have materials, in the same
// query (it used to be a second request after the list arrived).
export const EXPENSE_LIST_COLUMNS = `id, invoice_series, invoice_number, amount, currency,
  issued_at, paid_at, payment_method, notes, created_at,
  provider:provider_id(id, name, ruc),
  category:category_id(id, name, color),
  expense_item(count)`;
