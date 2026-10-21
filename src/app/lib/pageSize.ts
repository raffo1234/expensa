// Rows-per-page rules for every paginated list, shared by the browser (the
// input) and the server (which enforces them, so a tampered request can't ask
// for a huge page and overload the database).
export const DEFAULT_PAGE_SIZE = 10;
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 200;

/** Any whole number from 1 to 200; anything else falls back to the default. */
export function safePageSize(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < MIN_PAGE_SIZE) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}
