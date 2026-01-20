export default function formatDateYYYYMMDD(dateString: string) {
  // 1. Guard Clauses (Early return)
  if (!dateString || typeof dateString !== "string" || dateString.length !== 8) {
    return null;
  }

  const year = dateString.substring(0, 4);
  const monthStr = dateString.substring(4, 6);
  const dayStr = dateString.substring(6, 8);

  // 2. Validación básica de números
  const yearNum = parseInt(year, 10);
  const monthIndex = parseInt(monthStr, 10) - 1; // 0-11
  const dayNum = parseInt(dayStr, 10);

  if (isNaN(yearNum) || isNaN(monthIndex) || isNaN(dayNum)) return null;

  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  // 3. Validación de rango de mes
  if (monthIndex < 0 || monthIndex > 11) return null;

  // Retornamos directamente los valores parseados sin pasar por new Date()
  // Esto evita cualquier problema de Timezone local vs UTC.
  return `${dayNum} ${monthNames[monthIndex]} ${yearNum}`;
}