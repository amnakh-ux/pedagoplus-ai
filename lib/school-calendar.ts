export type CalendarPeriod = { start: string; end: string; label: string };
export type SchoolCalendar = { holidays: CalendarPeriod[]; vacations: CalendarPeriod[]; note?: string };
export function getSchoolCalendar(country: string, schoolYear: string): SchoolCalendar {
  return { holidays: [], vacations: [], note: `Aucun congé automatique pour ${country} (${schoolYear}). Renseignez vos périodes non travaillées dans la répartition des leçons.` };
}
export function findPeriod(periods: CalendarPeriod[], date: string) {
  return periods.find(period => date >= period.start && date <= period.end);
}
