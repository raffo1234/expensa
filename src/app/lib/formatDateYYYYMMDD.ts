export default function formatDateYYYYMMDD(dateString: string) {
  // 1. Early return: Validación de integridad
  if (!dateString || typeof dateString !== "string" || dateString.length !== 8) {
    return null;
  }

  // 2. Extracción directa (Evitamos el objeto Date y sus desfases)
  const year = dateString.substring(0, 4);
  const monthIdx = parseInt(dateString.substring(4, 6), 10) - 1;
  const day = parseInt(dateString.substring(6, 8), 10);

  // 3. Diccionario de meses
  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  // 4. Validación de lógica de calendario básica
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11 || isNaN(day)) {
    return null;
  }

  // 5. Retorno limpio
  return `${day} ${monthNames[monthIdx]} ${year}`;
}