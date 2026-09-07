export type RepartitionInput = {
  type: string;
  country: string;
  schoolYear: string;
  level: string;
  lessonsPerWeek: number;
  rows: Array<{ week: number; startDate: string; endDate: string; unit: string; lessons: string }>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateRepartitionInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<RepartitionInput>;
  if (!isNonEmptyString(input.type) || !isNonEmptyString(input.country) || !isNonEmptyString(input.schoolYear) || !isNonEmptyString(input.level) || !Number.isInteger(input.lessonsPerWeek) || Number(input.lessonsPerWeek) < 1 || !Array.isArray(input.rows) || input.rows.length === 0) return null;

  const rows = input.rows.map((row) => {
    if (!row || !Number.isInteger(row.week) || row.week < 1 || !isNonEmptyString(row.startDate) || !isNonEmptyString(row.endDate) || !isNonEmptyString(row.unit) || !isNonEmptyString(row.lessons)) return null;
    const startDate = parseDate(row.startDate);
    const endDate = parseDate(row.endDate);
    if (!startDate || !endDate || startDate > endDate) return null;
    return { week: row.week, startDate, endDate, unit: row.unit.trim(), lessons: row.lessons.trim() };
  });
  if (rows.some((row) => row === null)) return null;

  return { type: input.type.trim(), country: input.country.trim(), schoolYear: input.schoolYear.trim(), level: input.level.trim(), lessonsPerWeek: Number(input.lessonsPerWeek), rows: rows as NonNullable<(typeof rows)[number]>[] };
}
