/**
 * Escapes a value for a CSV cell.
 * - Quotes values containing commas, quotes or line breaks.
 * - Neutralizes spreadsheet formulas: a cell starting with = + - @ (or a tab /
 *   carriage return) is run as a formula by Excel and Google Sheets, so text
 *   such as provider names or notes (which may come from a read invoice) gets a
 *   leading apostrophe. Plain numbers like "-12.50" are left untouched.
 */
export function csvEscape(v: unknown): string {
  if (v == null) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
