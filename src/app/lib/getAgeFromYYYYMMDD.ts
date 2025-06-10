import { differenceInWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export default function getAgeFromYYYYMMDD(dateString: string) {
  if (!dateString || dateString.length !== 8 || !/^\d+$/.test(dateString)) {
    return { years: NaN, months: NaN, weeks: NaN }; // Invalid date format
  }

  const birthYear = parseInt(dateString.substring(0, 4));
  const birthMonth = parseInt(dateString.substring(4, 6)); // Month is 1-indexed here (from the string)
  const birthDay = parseInt(dateString.substring(6, 8));

  const now = toZonedTime(new Date(), "America/Lima"); // Use the specified timezone
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay); // Month in Date is 0-indexed

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // Month is 1-indexed
  const currentDay = now.getDate();

  let years = currentYear - birthYear;
  let months = currentMonth - birthMonth;
  let weeks = NaN;

  if (months < 0) {
    years--;
    months = 12 + months;
  } else if (months === 0 && currentDay < birthDay) {
    years--;
    months = 11;
  }

  if (years === 0 && months === 0) {
    weeks = differenceInWeeks(now, birthDate);
  }
  console.log({ years, months, weeks });
  return formatAge({ years, months, weeks });
}

function formatAge(ageResult: {
  years: number;
  months: number;
  weeks: number;
}) {
  if (isNaN(ageResult.years)) {
    return "Invalid Date";
  }

  if (ageResult.years >= 1) {
    const formattedYears = ageResult.years.toString().padStart(3, "0") + "Y";
    return formattedYears;
  } else if (ageResult.months >= 1) {
    const formattedMonths = ageResult.months.toString().padStart(3, "0") + "M";
    return formattedMonths;
  } else if (!isNaN(ageResult.weeks)) {
    const formattedWeeks = ageResult.weeks.toString().padStart(3, "0") + "W";
    return formattedWeeks;
  }
  return "000W";
}
