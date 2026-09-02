export type EthiopianDate = {
  year: number;
  month: number;
  day: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

export function ethiopianNewYear(year: number): Date {
  const gregorianYear = year + 7;
  const day = isEthiopianLeapYear(year) ? 12 : 11;

  return new Date(Date.UTC(gregorianYear, 8, day));
}

export function ethiopianToGregorian(
  year: number,
  month: number,
  day: number,
): Date | null {
  if (!Number.isInteger(year) || year < 1) return null;
  if (!Number.isInteger(month) || month < 1 || month > 13) return null;
  if (!Number.isInteger(day) || day < 1) return null;

  const maxDay =
    month === 13
      ? isEthiopianLeapYear(year)
        ? 6
        : 5
      : 30;

  if (day > maxDay) return null;

  const newYear = ethiopianNewYear(year);

  const offset =
    month <= 12
      ? (month - 1) * 30 + (day - 1)
      : 360 + (day - 1);

  const result = new Date(newYear);
  result.setUTCDate(result.getUTCDate() + offset);

  return result;
}

export function parseEthiopianDate(value: string): Date | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  // Numeric Ethiopian date:
  // 2018-12-24 or 2018/12/24
  const numericMatch = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (numericMatch) {
    return ethiopianToGregorian(
      Number(numericMatch[1]),
      Number(numericMatch[2]),
      Number(numericMatch[3]),
    );
  }

  // Display Ethiopian date:
  // Nehase 24, 2018 E.C.
  const displayMatch = trimmed.match(
    /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*E\.?C\.?$/i,
  );

  if (!displayMatch) return null;

  const monthName = displayMatch[1].toLowerCase();

  const monthIndex = ETHIOPIAN_MONTH_NAMES.findIndex(
    (name) => name.toLowerCase() === monthName,
  );

  if (monthIndex === -1) return null;

  return ethiopianToGregorian(
    Number(displayMatch[3]),
    monthIndex + 1,
    Number(displayMatch[2]),
  );
}

export function gregorianToEthiopian(date: Date): EthiopianDate {
  const gYear = date.getUTCFullYear();
  const gMonth = date.getUTCMonth() + 1;
  const gDay = date.getUTCDate();

  let ecYear = gMonth >= 9 ? gYear - 7 : gYear - 8;
  let newYear = ethiopianNewYear(ecYear);

  const current = Date.UTC(gYear, gMonth - 1, gDay);

  if (current < newYear.getTime()) {
    ecYear -= 1;
    newYear = ethiopianNewYear(ecYear);
  }

  const diff = Math.floor(
    (current - newYear.getTime()) / MS_PER_DAY,
  );

  if (diff < 360) {
    return {
      year: ecYear,
      month: Math.floor(diff / 30) + 1,
      day: (diff % 30) + 1,
    };
  }

  return {
    year: ecYear,
    month: 13,
    day: diff - 360 + 1,
  };
}

export function ecKey(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

export function formatEthiopianDate(date: Date): string {
  const ec = gregorianToEthiopian(date);

  return ecKey(ec.year, ec.month, ec.day);
}

export function formatEthiopianDateObject(
  date: EthiopianDate,
): string {
  return ecKey(date.year, date.month, date.day);
}

export function dateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

const ETHIOPIAN_MONTH_NAMES = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumen",
] as const;

export function formatEthiopianDisplay(
  date: Date | string,
): string {
  const value = date instanceof Date ? date : new Date(date);
  const ec = gregorianToEthiopian(value);
  const monthName = ETHIOPIAN_MONTH_NAMES[ec.month - 1];

  return `${monthName} ${ec.day}, ${ec.year} E.C.`;
}

export function formatEthiopianShort(
  date: Date | string,
): string {
  const value = date instanceof Date ? date : new Date(date);
  const ec = gregorianToEthiopian(value);

  return `${ec.year}-${String(ec.month).padStart(2, "0")}-${String(
    ec.day,
  ).padStart(2, "0")}`;
}

export function formatEthiopianMonthYear(
  date: Date | string,
): string {
  const value = date instanceof Date ? date : new Date(date);
  const ec = gregorianToEthiopian(value);
  const monthName = ETHIOPIAN_MONTH_NAMES[ec.month - 1];

  return `${monthName} ${ec.year} E.C.`;
}

export function daysInEthiopianMonth(
  year: number,
  month: number,
): number {
  if (month >= 1 && month <= 12) return 30;

  if (month === 13) {
    return isEthiopianLeapYear(year) ? 6 : 5;
  }

  return 0;
}

