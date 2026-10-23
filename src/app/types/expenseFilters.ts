export type ExpenseFilters = {
  issuedFrom: string;
  issuedTo: string;
  amountMin: string;
  amountMax: string;
  // ponytail: comma-joined category ids, avoids widening Filters to string | string[] everywhere
  categoryId: string;
  stageId: string;
  levelId: string;
  providerId: string;
  invoiceSeries: string;
  invoiceNumber: string;
  /** "1": only invoices that still lack their guía de remisión. */
  missingGuide?: string;
};

export function categoryIdList(categoryId: string): string[] {
  return categoryId ? categoryId.split(",").filter(Boolean) : [];
}
