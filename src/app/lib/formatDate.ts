export default function formatDate(dateString: string): string {
  if (dateString.length !== 8 || !/^\d+$/.test(dateString)) {
    return "Invalid date format. Please use YYYYMMDD.";
  }

  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // Month is 0-indexed in JavaScript Date
  const day = parseInt(dateString.substring(6, 8), 10);

  const date = new Date(year, month, day);

  const monthsOfYear = [
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

  const dayOfMonth = date.getDate();
  const monthName = monthsOfYear[date.getMonth()];
  const fullYear = date.getFullYear();

  return `${dayOfMonth} ${monthName} ${fullYear}`;
}
