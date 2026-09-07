"use client";

import Link from "next/link";
import { FormEvent, Fragment, useState } from "react";
import { findPeriod, getSchoolCalendar } from "@/lib/school-calendar";

const MONTHS = [
  { name: "Septembre", index: 8 }, { name: "Octobre", index: 9 },
  { name: "Novembre", index: 10 }, { name: "Décembre", index: 11 },
  { name: "Janvier", index: 0 }, { name: "Février", index: 1 },
  { name: "Mars", index: 2 }, { name: "Avril", index: 3 },
  { name: "Mai", index: 4 }, { name: "Juin", index: 5 },
] as const;

const WEEKDAY_INITIALS = ["D", "L", "M", "M", "J", "V", "S"] as const;

function getWeekdayInitial(year: number, monthIndex: number, day: number) {
  return WEEKDAY_INITIALS[new Date(Date.UTC(year, monthIndex, day)).getUTCDay()];
}

function getSeptemberStartActivities(
  year: number,
  startDate: string,
  endDate: string,
) {
  const activities: Record<string, string> = {};
  let schoolDayIndex = 0;

  for (let day = 1; day <= 14; day += 1) {
    const date = `${year}-09-${String(day).padStart(2, "0")}`;
    const weekday = new Date(Date.UTC(year, 8, day)).getUTCDay();

    if (weekday === 0 || weekday === 6 || date < startDate || date > endDate) {
      continue;
    }

    activities[date] =
      schoolDayIndex === 0
        ? "Accueil des élèves"
        : schoolDayIndex <= 4
          ? "Évaluation diagnostique"
          : schoolDayIndex <= 6
            ? "Correction de l’évaluation diagnostique"
            : "Remédiation";
    schoolDayIndex += 1;
  }

  return activities;
}

type GeneratedMonth = (typeof MONTHS)[number] & { year: number; days: number };
type GeneratedPlanning = {
  country: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  months: GeneratedMonth[];
};

export default function BlankAnnualRepartitionPage() {
  const [country, setCountry] = useState("Maroc");
  const [schoolYear, setSchoolYear] = useState("2026-2027");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2027-06-30");
  const [planning, setPlanning] = useState<GeneratedPlanning | null>(null);
  const [planningCells, setPlanningCells] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [exportError, setExportError] = useState("");
  const [error, setError] = useState("");

  function generatePlanning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const match = schoolYear.trim().match(/^(\d{4})\s*[-/]\s*(\d{4})$/);

    if (!match) {
      setPlanning(null);
      setError("Saisissez l’année scolaire au format 2026-2027.");
      return;
    }

    const firstYear = Number(match[1]);
    const secondYear = Number(match[2]);
    const normalizedSchoolYear = `${firstYear}-${secondYear}`;
    const earliestDate = `${firstYear}-09-01`;
    const latestDate = `${secondYear}-06-30`;

    if (secondYear !== firstYear + 1) {
      setPlanning(null);
      setError("L’année scolaire doit couvrir deux années consécutives.");
      return;
    }

    if (!startDate || !endDate || startDate > endDate) {
      setPlanning(null);
      setError("Choisissez une période valide : la date de début doit précéder la date de fin.");
      return;
    }

    if (startDate < earliestDate || endDate > latestDate) {
      setPlanning(null);
      setError(`La période doit être comprise entre le 1er septembre ${firstYear} et le 30 juin ${secondYear}.`);
      return;
    }

    setError("");
    setExportError("");
    setPlanningCells(getSeptemberStartActivities(firstYear, startDate, endDate));
    setPlanning({
      country,
      schoolYear: normalizedSchoolYear,
      startDate,
      endDate,
      months: MONTHS.map((month) => {
        const year = month.index >= 8 ? firstYear : secondYear;
        return { ...month, year, days: new Date(year, month.index + 1, 0).getDate() };
      }),
    });
  }

  const calendar = planning ? getSchoolCalendar(planning.country, planning.schoolYear) : null;

  async function downloadExcel() {
    if (!planning || isExporting) return;

    setIsExporting(true);
    setExportError("");

    try {
      const [ExcelJS, fileSaver] = await Promise.all([
        import("exceljs"),
        import("file-saver"),
      ]);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "PedagoPlus AI";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Répartition annuelle", {
        views: [{ state: "frozen", ySplit: 7 }],
        pageSetup: {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          paperSize: 9,
        },
      });

      const lastColumn = planning.months.length * 3;
      worksheet.mergeCells(1, 1, 1, lastColumn);
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = "RÉPARTITION ANNUELLE VIERGE";
      titleCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(1).height = 28;

      const informationRows = [
        ["Pays", planning.country],
        ["Année scolaire", planning.schoolYear],
        ["Période", `Du ${planning.startDate} au ${planning.endDate}`],
      ];
      informationRows.forEach(([label, value], index) => {
        const row = index + 2;
        worksheet.getCell(row, 1).value = label;
        worksheet.getCell(row, 1).font = { bold: true, color: { argb: "FF1E3A8A" } };
        worksheet.mergeCells(row, 2, row, lastColumn);
        worksheet.getCell(row, 2).value = value;
      });

      planning.months.forEach((month, monthIndex) => {
        const dayColumn = monthIndex * 3 + 1;
        const weekdayColumn = dayColumn + 1;
        const planningColumn = dayColumn + 2;
        worksheet.mergeCells(6, dayColumn, 6, planningColumn);
        const monthCell = worksheet.getCell(6, dayColumn);
        monthCell.value = `${month.name} ${month.year}`;
        monthCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        monthCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
        monthCell.alignment = { horizontal: "center", vertical: "middle" };

        for (const [column, value] of [[dayColumn, "N°"], [weekdayColumn, "J. sem."], [planningColumn, "Planning"]] as const) {
          const cell = worksheet.getCell(7, column);
          cell.value = value;
          cell.font = { bold: true, color: { argb: "FF334155" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
          cell.alignment = { horizontal: column === dayColumn ? "center" : "left", vertical: "middle" };
        }

        worksheet.getColumn(dayColumn).width = 8;
        worksheet.getColumn(weekdayColumn).width = 9;
        worksheet.getColumn(planningColumn).width = 24;

        for (let day = 1; day <= 31; day += 1) {
          const row = day + 7;
          const isValidDay = day <= month.days;
          const date = `${month.year}-${String(month.index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isInPeriod = isValidDay && date >= planning.startDate && date <= planning.endDate;
          const holiday = calendar && isInPeriod ? findPeriod(calendar.holidays, date) : undefined;
          const vacation = calendar && isInPeriod ? findPeriod(calendar.vacations, date) : undefined;
          const fillColor = !isInPeriod ? "FFF1F5F9" : holiday ? "FFFFE4E6" : vacation ? "FFFEF3C7" : "FFFFFFFF";
          const label = holiday?.label ?? vacation?.label;
          const dayCell = worksheet.getCell(row, dayColumn);
          const weekdayCell = worksheet.getCell(row, weekdayColumn);
          const planningCell = worksheet.getCell(row, planningColumn);

          dayCell.value = isValidDay ? day : null;
          weekdayCell.value = isValidDay ? getWeekdayInitial(month.year, month.index, day) : null;
          planningCell.value = isInPeriod ? planningCells[date] ?? "" : null;
          dayCell.alignment = { horizontal: "center", vertical: "middle" };
          weekdayCell.alignment = { horizontal: "center", vertical: "middle" };
          planningCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
          dayCell.font = { color: { argb: isInPeriod ? "FF334155" : "FFCBD5E1" } };
          weekdayCell.font = { color: { argb: isInPeriod ? "FF334155" : "FFCBD5E1" } };

          for (const cell of [dayCell, weekdayCell, planningCell]) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
            if (label) cell.note = label;
          }
        }
      });

      for (let row = 8; row <= 38; row += 1) worksheet.getRow(row).height = 28;
      worksheet.getRow(6).height = 24;
      worksheet.getRow(7).height = 22;
      worksheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: 38, column: lastColumn } };

      const legend = [
        ["FFFEF3C7", "Vacances scolaires"],
        ["FFFFE4E6", "Jour férié"],
        ["FFFFFFFF", "Jour de classe"],
        ["FFF1F5F9", "Hors période"],
      ];
      legend.forEach(([color, label], index) => {
        const row = 40 + index;
        worksheet.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        worksheet.getCell(row, 1).border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
        worksheet.mergeCells(row, 2, row, 4);
        worksheet.getCell(row, 2).value = label;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const safeCountry = planning.country.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-");
      fileSaver.saveAs(blob, `repartition-annuelle-${safeCountry}-${planning.schoolYear}.xlsx`);
    } catch (caughtError) {
      console.error(caughtError);
      setExportError("L’export Excel a échoué. Veuillez réessayer.");
    } finally {
      setIsExporting(false);
    }
  }

  async function downloadWord() {
    if (!planning || isExportingWord) return;

    setIsExportingWord(true);
    setExportError("");

    try {
      const [docx, fileSaver] = await Promise.all([
        import("docx"),
        import("file-saver"),
      ]);
      const {
        AlignmentType,
        Document,
        HeadingLevel,
        Packer,
        PageOrientation,
        Paragraph,
        Table,
        TableCell,
        TableRow,
        TextRun,
        WidthType,
      } = docx;

      const compactParagraph = (text: string, bold = false, color = "000000") =>
        new Paragraph({
          spacing: { before: 0, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold, color, size: 10 })],
        });

      const monthHeader = new TableRow({
        tableHeader: true,
        children: planning.months.map((month) =>
          new TableCell({
            columnSpan: 3,
            shading: { fill: "2563EB" },
            margins: { top: 30, bottom: 30, left: 20, right: 20 },
            children: [compactParagraph(`${month.name} ${month.year}`, true, "FFFFFF")],
          }),
        ),
      });

      const columnHeader = new TableRow({
        tableHeader: true,
        children: planning.months.flatMap(() =>
          [
            { text: "N°", width: 2 },
            { text: "J", width: 2 },
            { text: "Planning", width: 6 },
          ].map(({ text, width }) =>
            new TableCell({
              width: { size: width, type: WidthType.PERCENTAGE },
              shading: { fill: "DBEAFE" },
              margins: { top: 20, bottom: 20, left: 15, right: 15 },
              children: [compactParagraph(text, true, "1E3A8A")],
            }),
          ),
        ),
      });

      const dayRows = Array.from({ length: 31 }, (_, index) => index + 1).map(
        (day) =>
          new TableRow({
            children: planning.months.flatMap((month) => {
              const isValidDay = day <= month.days;
              const date = `${month.year}-${String(month.index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isInPeriod = isValidDay && date >= planning.startDate && date <= planning.endDate;
              const holiday = calendar && isInPeriod ? findPeriod(calendar.holidays, date) : undefined;
              const vacation = calendar && isInPeriod ? findPeriod(calendar.vacations, date) : undefined;
              const fill = !isInPeriod ? "F1F5F9" : holiday ? "FFE4E6" : vacation ? "FEF3C7" : "FFFFFF";
              const values = [
                isValidDay ? String(day) : "",
                isValidDay ? getWeekdayInitial(month.year, month.index, day) : "",
                isInPeriod ? planningCells[date] ?? "" : "",
              ];

              return values.map((value, columnIndex) =>
                new TableCell({
                  width: { size: columnIndex === 2 ? 6 : 2, type: WidthType.PERCENTAGE },
                  shading: { fill },
                  margins: { top: 10, bottom: 10, left: 12, right: 12 },
                  children: [compactParagraph(value)],
                }),
              );
            }),
          }),
      );

      const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          children: [new TextRun({ text: "Répartition annuelle vierge", bold: true, color: "000000", size: 20 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [new TextRun({ text: `${planning.country} — ${planning.schoolYear}`, size: 12 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 50 },
          children: [new TextRun({ text: `Période du ${planning.startDate} au ${planning.endDate}`, size: 11 })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [monthHeader, columnHeader, ...dayRows],
        }),
      ];

      const document = new Document({
        creator: "PedagoPlus AI",
        title: `Répartition annuelle vierge ${planning.schoolYear}`,
        sections: [{
          properties: {
            page: {
              size: { orientation: PageOrientation.LANDSCAPE, width: 23811, height: 16838 },
              margin: { top: 240, right: 240, bottom: 240, left: 240 },
            },
          },
          children,
        }],
      });
      const blob = await Packer.toBlob(document);
      const safeCountry = planning.country.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-");
      fileSaver.saveAs(blob, `repartition-annuelle-${safeCountry}-${planning.schoolYear}.docx`);
    } catch (caughtError) {
      console.error(caughtError);
      setExportError("L’export Word a échoué. Veuillez réessayer.");
    } finally {
      setIsExportingWord(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/repartition" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Choisir un autre type de répartition
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-slate-900">Répartition annuelle vierge</h1>
        <p className="mt-2 text-slate-600">Renseignez les informations générales de l’année scolaire.</p>

        <form onSubmit={generatePlanning} className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Informations scolaires</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="country" className="mb-2 block text-sm font-medium">Pays</label>
              <select id="country" name="country" value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3">
                <option>Maroc</option><option>Algérie</option><option>Tunisie</option>
                <option>France</option><option>Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="schoolYear" className="mb-2 block text-sm font-medium">Année scolaire</label>
              <input id="schoolYear" name="schoolYear" type="text" value={schoolYear}
                onChange={(event) => setSchoolYear(event.target.value)} placeholder="Ex. 2026-2027"
                className="w-full rounded-xl border border-slate-300 p-3" />
            </div>
            <div>
              <label htmlFor="startDate" className="mb-2 block text-sm font-medium">Date de début</label>
              <input id="startDate" name="startDate" type="date" value={startDate}
                onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-xl border border-slate-300 p-3" />
            </div>
            <div>
              <label htmlFor="endDate" className="mb-2 block text-sm font-medium">Date de fin</label>
              <input id="endDate" name="endDate" type="date" value={endDate}
                onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-xl border border-slate-300 p-3" />
            </div>
          </div>

          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          <button type="submit" className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
            Générer le tableau
          </button>
        </form>

        {planning && (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Planning {planning.schoolYear} — {planning.country}</h2>
            <p className="mt-2 text-sm text-slate-600">Complétez librement les cellules comprises dans la période choisie.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={downloadExcel} disabled={isExporting}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                {isExporting ? "Création du fichier…" : "Télécharger en Excel"}
              </button>
              <button type="button" onClick={downloadWord} disabled={isExportingWord}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                {isExportingWord ? "Création du document…" : "Télécharger en Word"}
              </button>
            </div>
            {exportError && <p role="alert" className="mt-3 text-sm text-red-700">{exportError}</p>}
            {calendar ? (
              <>
                <div aria-label="Légende du calendrier" className="mt-4 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-amber-300 bg-amber-100" /> Vacances scolaires</span>
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-rose-300 bg-rose-100" /> Jour férié</span>
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-white bg-white" /> Jour de classe</span>
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-slate-200 bg-slate-100" /> Hors période</span>
                </div>
                {calendar.note && <p className="mt-3 text-sm text-slate-600">{calendar.note}</p>}
              </>
            ) : (
              <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                Aucun calendrier n’est disponible pour {planning.country}, année {planning.schoolYear}. Le tableau reste modifiable sans coloration automatique.
              </p>
            )}
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[1800px] border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    {planning.months.map((month) => (
                      <th key={`${month.name}-${month.year}`} colSpan={3} className="border border-blue-500 px-3 py-3 text-center font-semibold">
                        {month.name} {month.year}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-blue-50 text-slate-700">
                    {planning.months.map((month) => (
                      <Fragment key={`${month.name}-${month.year}-columns`}>
                        <th className="w-16 border border-slate-200 px-2 py-2 text-center">N°</th>
                        <th className="w-16 border border-slate-200 px-2 py-2 text-center">J. sem.</th>
                        <th className="min-w-28 border border-slate-200 px-2 py-2 text-left">Planning</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                    <tr key={day} className="even:bg-slate-50">
                      {planning.months.map((month) => {
                        const isValidDay = day <= month.days;
                        const date = `${month.year}-${String(month.index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isInPeriod = isValidDay && date >= planning.startDate && date <= planning.endDate;
                        const holiday = calendar && isInPeriod ? findPeriod(calendar.holidays, date) : undefined;
                        const vacation = calendar && isInPeriod ? findPeriod(calendar.vacations, date) : undefined;
                        const color = !isInPeriod ? "bg-slate-100" : holiday ? "bg-rose-100" : vacation ? "bg-amber-100" : "";
                        const label = !isInPeriod ? "Hors de la période choisie" : holiday?.label ?? vacation?.label;
                        return (
                          <Fragment key={`${month.name}-${day}`}>
                            <td title={label} className={`border border-slate-200 px-2 py-2 text-center font-medium ${isInPeriod ? "text-slate-700" : "text-slate-300"} ${color}`}>
                              {isValidDay ? day : ""}
                            </td>
                            <td title={label} className={`border border-slate-200 px-2 py-2 text-center font-medium ${isInPeriod ? "text-slate-700" : "text-slate-300"} ${color}`}>
                              {isValidDay ? getWeekdayInitial(month.year, month.index, day) : ""}
                            </td>
                            <td title={label} className={`border border-slate-200 p-1 ${color}`}>
                              {isInPeriod && <input aria-label={`Planning du ${day} ${month.name} ${month.year}`}
                                value={planningCells[date] ?? ""}
                                onChange={(event) => setPlanningCells((current) => ({ ...current, [date]: event.target.value }))}
                                className="w-full rounded-md bg-transparent px-2 py-1 outline-none focus:bg-blue-50" />}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
