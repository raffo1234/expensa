export default function formatDateYYYYMMDD(dateString: string) {
  if (
    !dateString ||
    typeof dateString !== "string" ||
    dateString.length !== 8
  ) {
    return null;
  }

  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);

  const date = new Date(`${year}-${month}-${day}`);

  if (isNaN(date.getTime())) {
    return null;
  }

  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const dayOfMonth = date.getDate(); // Gets the day (1-31)
  const monthIndex = date.getMonth(); // Gets the month index (0-11)
  const fullYear = date.getFullYear(); // Gets the full year (e.g., 2025)

  return `${dayOfMonth} ${monthNames[monthIndex]} ${fullYear}`;
}
