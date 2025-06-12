export function formatDDMMYYYYtoMMYY(dateString: string): string {
  if (dateString.length !== 8 || !/^\d+$/.test(dateString)) {
    return "Invalid date format. Please use DDMMYYYY.";
  }

  const month = dateString.substring(2, 4).padStart(2, "0");
  const yearFull = dateString.substring(4, 8);
  const yearShort = yearFull.slice(-2).padStart(2, "0");

  return `${month}${yearShort}`;
}

/**
 * Creates a 4-character age string with leading zeros for the numerical value.
 *
 * @param value The numerical age value.
 * @param unit The age unit in Spanish ("años", "meses", "semanas", "dias").
 * @returns The formatted age string (e.g., "012M", "025Y"), or null if the unit is invalid or value is not valid.
 */
export function createAgeString(value: number, unit: string): string | null {
  if (typeof value !== "number" || isNaN(value) || value < 0) {
    return null;
  }

  const formattedValue = value.toString().padStart(3, "0");
  const unitLower = unit.toLowerCase();
  let unitChar: string | null = null;

  switch (unitLower) {
    case "años":
      unitChar = "Y";
      break;
    case "meses":
      unitChar = "M";
      break;
    case "semanas":
      unitChar = "W";
      break;
    case "dias":
      unitChar = "D";
      break;
    default:
      return null; // Invalid unit
  }

  return unitChar ? `${formattedValue}${unitChar}` : null;
}

/**
 * Calculates the number of years between the year in the input date string (YYYYMMDD)
 * and the current year (2025), and returns it in the format "ABY".
 *
 * @param dateString The date string in<ctrl98>MMDD format.
 * @returns A string in the format "ABY" representing the years passed since the input year until 2025,
 * or an error message if the input format is invalid.
 */
export function formatYYYYMMDDtoABY(dateString: string): string {
  if (dateString.length !== 8 || !/^\d+$/.test(dateString)) {
    return "Invalid date format. Please use<0xED><0xA0><0xBD><0xAC>MMDD.";
  }

  const inputYear = parseInt(dateString.substring(0, 4), 10);
  const currentYear = new Date().getFullYear(); // Dynamically get the current year

  const yearsPassed = currentYear - inputYear;
  const formattedYears = yearsPassed.toString().padStart(3, "0");

  return `${formattedYears}Y`;
}
