export type CalendarPeriod = {
  start: string;
  end: string;
  label: string;
};

export type SchoolCalendar = {
  holidays: CalendarPeriod[];
  vacations: CalendarPeriod[];
  note?: string;
};

const SCHOOL_VACATIONS: Record<string, Pick<SchoolCalendar, "vacations" | "note">> = {
  "Maroc:2026-2027": {
    vacations: [
      { start: "2026-10-18", end: "2026-10-25", label: "Premières vacances intermédiaires" },
      { start: "2026-12-06", end: "2026-12-13", label: "Deuxièmes vacances intermédiaires" },
      { start: "2027-01-24", end: "2027-01-31", label: "Vacances de mi-année" },
      { start: "2027-03-21", end: "2027-03-28", label: "Troisièmes vacances intermédiaires" },
      { start: "2027-05-09", end: "2027-05-16", label: "Quatrièmes vacances intermédiaires" },
    ],
    note: "Les dates des fêtes religieuses restent indicatives jusqu’à leur confirmation officielle.",
  },
  "France:2026-2027": {
    vacations: [
      { start: "2026-10-18", end: "2026-11-01", label: "Vacances de la Toussaint" },
      { start: "2026-12-20", end: "2027-01-03", label: "Vacances de Noël" },
      { start: "2027-02-14", end: "2027-02-28", label: "Vacances d’hiver — zone A" },
      { start: "2027-04-11", end: "2027-04-25", label: "Vacances de printemps — zone A" },
    ],
    note: "Pour la France métropolitaine, les vacances d’hiver et de printemps correspondent à la zone A.",
  },
  "Tunisie:2026-2027": {
    vacations: [
      { start: "2026-10-26", end: "2026-11-01", label: "Vacances de mi-trimestre" },
      { start: "2026-12-21", end: "2027-01-03", label: "Vacances d’hiver" },
      { start: "2027-02-01", end: "2027-02-07", label: "Vacances de mi-trimestre" },
      { start: "2027-03-20", end: "2027-04-04", label: "Vacances de printemps" },
    ],
    note: "Les congés liés aux fêtes religieuses peuvent être ajustés après leur annonce officielle.",
  },
};

const FIXED_HOLIDAYS: Record<string, Array<{ month: number; day: number; label: string }>> = {
  Maroc: [
    { month: 1, day: 1, label: "Nouvel An" },
    { month: 1, day: 11, label: "Manifeste de l’Indépendance" },
    { month: 1, day: 14, label: "Nouvel An amazigh" },
    { month: 5, day: 1, label: "Fête du Travail" },
    { month: 7, day: 30, label: "Fête du Trône" },
    { month: 8, day: 14, label: "Allégeance Oued Eddahab" },
    { month: 8, day: 20, label: "Révolution du Roi et du Peuple" },
    { month: 8, day: 21, label: "Fête de la Jeunesse" },
    { month: 10, day: 31, label: "Fête de l’Unité" },
    { month: 11, day: 6, label: "Marche Verte" },
    { month: 11, day: 18, label: "Fête de l’Indépendance" },
  ],
  Algérie: [
    { month: 1, day: 1, label: "Jour de l’An" },
    { month: 1, day: 12, label: "Yennayer" },
    { month: 5, day: 1, label: "Fête du Travail" },
    { month: 7, day: 5, label: "Fête de l’Indépendance" },
    { month: 11, day: 1, label: "Anniversaire de la Révolution" },
  ],
  Tunisie: [
    { month: 1, day: 1, label: "Jour de l’An" },
    { month: 3, day: 20, label: "Fête de l’Indépendance" },
    { month: 4, day: 9, label: "Journée des Martyrs" },
    { month: 5, day: 1, label: "Fête du Travail" },
    { month: 7, day: 25, label: "Fête de la République" },
    { month: 8, day: 13, label: "Fête de la Femme" },
    { month: 10, day: 15, label: "Fête de l’Évacuation" },
    { month: 12, day: 17, label: "Fête de la Révolution" },
  ],
  France: [
    { month: 1, day: 1, label: "Jour de l’An" },
    { month: 5, day: 1, label: "Fête du Travail" },
    { month: 5, day: 8, label: "Victoire de 1945" },
    { month: 7, day: 14, label: "Fête nationale" },
    { month: 8, day: 15, label: "Assomption" },
    { month: 11, day: 1, label: "Toussaint" },
    { month: 11, day: 11, label: "Armistice" },
    { month: 12, day: 25, label: "Noël" },
  ],
};

const DATED_HOLIDAYS: Record<string, CalendarPeriod[]> = {
  "Maroc:2026-2027": [
    { start: "2027-03-10", end: "2027-03-12", label: "Aïd al-Fitr (date indicative)" },
    { start: "2027-05-17", end: "2027-05-19", label: "Aïd al-Adha (date indicative)" },
    { start: "2027-06-06", end: "2027-06-06", label: "1er Mouharram (date indicative)" },
  ],
  "Tunisie:2026-2027": [
    { start: "2027-05-16", end: "2027-05-17", label: "Aïd al-Adha (date indicative)" },
  ],
};

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getFixedHolidays(country: string, startYear: number, endYear: number) {
  return (FIXED_HOLIDAYS[country] ?? []).flatMap((holiday) =>
    [startYear, endYear].map((year) => {
      const date = formatDate(year, holiday.month, holiday.day);
      return { start: date, end: date, label: holiday.label };
    }),
  );
}

function getFrenchMovableHolidays(year: number): CalendarPeriod[] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(Date.UTC(year, month - 1, day));

  return [
    { offset: 1, label: "Lundi de Pâques" },
    { offset: 39, label: "Ascension" },
    { offset: 50, label: "Lundi de Pentecôte" },
  ].map(({ offset, label }) => {
    const holiday = new Date(easter);
    holiday.setUTCDate(holiday.getUTCDate() + offset);
    const date = holiday.toISOString().slice(0, 10);
    return { start: date, end: date, label };
  });
}

export function getSchoolCalendar(country: string, schoolYear: string): SchoolCalendar | null {
  if (country === "Autre") return null;

  const match = schoolYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  const schoolCalendar = SCHOOL_VACATIONS[`${country}:${schoolYear}`];
  const holidays = [
    ...getFixedHolidays(country, startYear, endYear),
    ...(country === "France" ? [startYear, endYear].flatMap(getFrenchMovableHolidays) : []),
    ...(DATED_HOLIDAYS[`${country}:${schoolYear}`] ?? []),
  ];

  if (!schoolCalendar && holidays.length === 0) return null;

  return {
    holidays,
    vacations: schoolCalendar?.vacations ?? [],
    note: schoolCalendar?.note ??
      `Les jours fériés fixes de ${country} sont affichés. Le calendrier officiel des vacances ${schoolYear} n’est pas encore renseigné.`,
  };
}

export function findPeriod(periods: CalendarPeriod[], date: string) {
  return periods.find((period) => date >= period.start && date <= period.end);
}
