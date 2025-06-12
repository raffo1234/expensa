import { differenceInWeeks, differenceInMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export default function getAgeFromYYYYMMDD(dateString: string) {
  if (!dateString || dateString.length !== 8 || !/^\d+$/.test(dateString)) {
    return { years: NaN, months: NaN, weeks: NaN }; // Invalid date format
  }

  const birthYear = parseInt(dateString.substring(0, 4));
  const birthMonth = parseInt(dateString.substring(4, 6));
  const birthDay = parseInt(dateString.substring(6, 8));

  const now = toZonedTime(new Date(), "America/Lima");
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

  const years = now.getFullYear() - birthDate.getFullYear();
  const months = differenceInMonths(now, birthDate) - years * 12;
  const weeks = differenceInWeeks(now, birthDate);

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
