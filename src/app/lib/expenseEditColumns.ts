// Columns the edit expense form reads, shared by the page's first render and
// the form's own fetcher (getExpenseForEdit) so both return the same shape.
// user!guide_exempt_by: expense has two links to user, so name the column.
export const EXPENSE_EDIT_COLUMNS = `
  id, amount, currency, issued_at, paid_at, payment_method, notes, created_at, invoice_series, invoice_number, tax_status,
  guide_exempt_reason, guide_exempt_note, guide_exempt_at,
  guide_exempt_by_user:user!guide_exempt_by(email),
  provider:provider_id(id, name),
  category:category_id(id, name, color, requires_guide),
  stage:stage_id(id, name, color),
  level:level_id(id, name),
  expense_attachment(id, file_name, storage_path)
`;
