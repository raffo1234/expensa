/**
 * Page number from the URL (?page=3 is the third page, as shown on screen).
 * Anything that isn't a whole number from 1 up (abc, -2, 2.5) reads as page 1.
 */
export function pageFromParam(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
