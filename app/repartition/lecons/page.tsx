"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Lesson = {
  unite: string;
  lecon: string;
};

type RepartitionRow = {
  semaine: number;
  debut: string;
  fin: string;
  unite: string;
  lecons: string;
};

type Vacation = {
  start: Date;
  end: Date;
};

type ImportTarget = "vacances" | "sommaire";

const MAX_BROWSER_OCR_PAGES = 20;

type StoredRepartition = {
  id: string;
  type: string;
  country: string;
  schoolYear: string;
  level: string;
  lessonsPerWeek: number;
  rows: Array<{ week: number; startDate: string; endDate: string; unit: string; lessons: string }>;
};

export default function RepartitionPage() {
  const type = "annuelle";
  const [pays, setPays] = useState("Maroc");
  const [annee, setAnnee] = useState("2026-2027");
  const [niveau, setNiveau] = useState("CM2");

  const [vacancesFileName, setVacancesFileName] = useState("");
  const [sommaireFileName, setSommaireFileName] = useState("");
  const [importing, setImporting] = useState<ImportTarget | null>(null);
  const [importError, setImportError] = useState<Record<ImportTarget, string>>({
    vacances: "",
    sommaire: "",
  });

  const [vacances, setVacances] = useState("");
  const [sommaire, setSommaire] = useState("");

  const [leconsParSemaine, setLeconsParSemaine] = useState(5);

  const [repartition, setRepartition] = useState<RepartitionRow[]>([]);
  const [message, setMessage] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    void fetch(`/api/repartitions/${id}`).then(async (response) => {
      const data = (await response.json()) as StoredRepartition & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Impossible d’ouvrir cette répartition.");
      const date = (value: string) => new Date(value).toLocaleDateString("fr-FR");
      setPays(data.country);
      setAnnee(data.schoolYear);
      setNiveau(data.level);
      setLeconsParSemaine(data.lessonsPerWeek);
      setRepartition(data.rows.map((row) => ({ semaine: row.week, debut: date(row.startDate), fin: date(row.endDate), unite: row.unit, lecons: row.lessons })));
      setSavedId(data.id);
      setMessage("Répartition chargée depuis l’historique.");
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Impossible d’ouvrir cette répartition."));
  }, []);

  async function saveRepartition() {
    if (repartition.length === 0) return;
    setSaving(true);
    try {
      const response = await fetch(savedId ? `/api/repartitions/${savedId}` : "/api/repartitions", {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          country: pays,
          schoolYear: annee,
          level: niveau,
          lessonsPerWeek: leconsParSemaine,
          rows: repartition.map((row) => ({ week: row.semaine, startDate: row.debut, endDate: row.fin, unit: row.unite, lessons: row.lecons })),
        }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "L’enregistrement a échoué.");
      setSavedId(data.id);
      setMessage(savedId ? "Répartition modifiée avec succès." : "Répartition enregistrée avec succès.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "L’enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  }

  async function importDocument(file: File, target: ImportTarget) {
    setImporting(target);
    setImportError((current) => ({ ...current, [target]: "" }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract-document", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        text?: string;
        error?: string;
        requiresOcr?: boolean;
        pageCount?: number;
      };

      let extractedText = result.text;

      if (result.requiresOcr && file.name.toLowerCase().endsWith(".pdf")) {
        extractedText = await extractScannedPdfInBrowser(file, result.pageCount);
      }

      if ((!response.ok && !result.requiresOcr) || !extractedText) {
        throw new Error(result.error ?? "Impossible de lire ce document.");
      }

      if (target === "vacances") {
        setVacances(extractedText);
      } else {
        setSommaire(extractedText);
      }
    } catch (error) {
      setImportError((current) => ({
        ...current,
        [target]:
          error instanceof Error ? error.message : "Impossible de lire ce document.",
      }));
    } finally {
      setImporting(null);
    }
  }

  async function extractScannedPdfInBrowser(
    file: File,
    reportedPageCount?: number,
  ) {
    const [{ getDocumentProxy }, { createWorker }] = await Promise.all([
      import("unpdf"),
      import("tesseract.js"),
    ]);
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const pageCount = Math.min(
      reportedPageCount ?? pdf.numPages,
      MAX_BROWSER_OCR_PAGES,
    );
    const worker = await createWorker("fra");
    const pages: string[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Votre navigateur ne permet pas de lire ce PDF numérisé.");
        }

        await page.render({ canvas, viewport }).promise;
        const result = await worker.recognize(canvas);
        const text = result.data.text.trim();
        if (text) pages.push(text);
        page.cleanup();
      }
    } finally {
      await worker.terminate();
    }

    const text = pages.join("\n\n").trim();
    if (!text) {
      throw new Error("Aucun texte n’a été reconnu dans ce PDF numérisé.");
    }

    return text;
  }

  async function handleVacancesFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      setVacancesFileName(file.name);
      await importDocument(file, "vacances");
      event.target.value = "";
    }
  }

  async function handleSommaireFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      setSommaireFileName(file.name);
      await importDocument(file, "sommaire");
      event.target.value = "";
    }
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString("fr-FR");
  }

  function parseDate(value: string) {
    const [day, month, year] = value.split("/").map(Number);

    return new Date(year, month - 1, day);
  }

  function extractVacations(): Vacation[] {
    const result: Vacation[] = [];

    const regex =
      /(\d{2}\/\d{2}\/\d{4})\s*(?:au|-)\s*(\d{2}\/\d{2}\/\d{4})/g;

    let match;

    while ((match = regex.exec(vacances)) !== null) {
      result.push({
        start: parseDate(match[1]),
        end: parseDate(match[2]),
      });
    }

    return result;
  }

  function extractLessons(): Lesson[] {
    const lines = sommaire
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const lessons: Lesson[] = [];

    let currentUnit = "Programme général";

    for (const originalLine of lines) {
      const line = originalLine.trim();

      const isUnit =
        /^unité\s*\d*/i.test(line) ||
        /^unite\s*\d*/i.test(line) ||
        /^module\s*\d*/i.test(line) ||
        /^séquence\s*\d*/i.test(line) ||
        /^sequence\s*\d*/i.test(line) ||
        /^chapitre\s*\d*/i.test(line);

      if (isUnit) {
        currentUnit = line;
        continue;
      }

      const cleanedLesson = line
        .replace(/^[-•–—]\s*/, "")
        .replace(/^\d+[.)-]\s*/, "")
        .replace(/^leçon\s*\d*\s*[:.-]?\s*/i, "")
        .replace(/^lecon\s*\d*\s*[:.-]?\s*/i, "")
        .trim();

      if (cleanedLesson.length > 1) {
        lessons.push({
          unite: currentUnit,
          lecon: cleanedLesson,
        });
      }
    }

    return lessons;
  }

  function weekIsVacation(
    startWeek: Date,
    endWeek: Date,
    schoolVacations: Vacation[]
  ) {
    return schoolVacations.some((vacation) => {
      return (
        startWeek <= vacation.end &&
        endWeek >= vacation.start
      );
    });
  }

  function generateRepartition() {
    const lessons = extractLessons();

    if (lessons.length === 0) {
      setMessage(
        "Ajoutez les unités et les leçons avant de générer la répartition."
      );

      setRepartition([]);
      return;
    }

    const schoolVacations = extractVacations();

    const startYear = Number(annee.split("-")[0]);

    const currentDate = new Date(startYear, 8, 1);

    while (currentDate.getDay() !== 1) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const endSchoolYear = new Date(
      startYear + 1,
      5,
      30
    );

    const rows: RepartitionRow[] = [];

    let lessonIndex = 0;
    let weekNumber = 1;

    while (currentDate <= endSchoolYear) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);

      weekEnd.setDate(weekEnd.getDate() + 4);
      if (weekEnd > endSchoolYear) weekEnd.setTime(endSchoolYear.getTime());

      const isVacation = weekIsVacation(
        weekStart,
        weekEnd,
        schoolVacations
      );

      if (isVacation) {
        rows.push({
          semaine: weekNumber,
          debut: formatDate(weekStart),
          fin: formatDate(weekEnd),
          unite: "Vacances scolaires",
          lecons: "Aucune leçon — vacances scolaires",
        });
      } else {
        const weekLessons = lessons.slice(
          lessonIndex,
          lessonIndex + leconsParSemaine
        );

        if (weekLessons.length > 0) {
          const units = Array.from(
            new Set(
              weekLessons.map(
                (lesson) => lesson.unite
              )
            )
          ).join(" / ");

          rows.push({
            semaine: weekNumber,
            debut: formatDate(weekStart),
            fin: formatDate(weekEnd),
            unite: units,
            lecons: weekLessons
              .map((lesson) => lesson.lecon)
              .join(" • "),
          });

          lessonIndex += weekLessons.length;
        } else {
          rows.push({
            semaine: weekNumber,
            debut: formatDate(weekStart),
            fin: formatDate(weekEnd),
            unite: "Programme terminé",
            lecons: "Aucune leçon à planifier",
          });
        }
      }

      weekNumber++;
      currentDate.setDate(
        currentDate.getDate() + 7
      );
    }

    setRepartition(rows);

    const remainingLessons = lessons.length - lessonIndex;
    const vacationWeekCount = rows.filter(
      (row) => row.unite === "Vacances scolaires"
    ).length;
    const teachingWeekCount = rows.length - vacationWeekCount;
    const vacationSummary = `${vacationWeekCount} semaine(s) de vacances conservée(s) sans leçons.`;

    setMessage(
      remainingLessons > 0
        ? `${lessonIndex} leçon(s) répartie(s) sur ${teachingWeekCount} semaine(s) de cours. ${vacationSummary} ${remainingLessons} leçon(s) restent à planifier après la fin de l’année scolaire.`
        : `${lessons.length} leçon(s) répartie(s) sur ${teachingWeekCount} semaine(s) de cours. ${vacationSummary}`
    );
  }

  async function downloadExcel() {
    if (repartition.length === 0) {
      return;
    }

    const [ExcelJS, fileSaver] = await Promise.all([
      import("exceljs"),
      import("file-saver"),
    ]);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Répartition des leçons", {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: "7:7",
      },
    });
    const rows = [
      ["PEDAGOPLUS AI"],
      ["Répartition", type],
      ["Pays", pays],
      ["Niveau", niveau],
      ["Année scolaire", annee],
      [],
      [
        "Semaine",
        "Du",
        "Au",
        "Unité",
        "Leçons",
      ],
      ...repartition.map((row) => [
        `S${row.semaine}`,
        row.debut,
        row.fin,
        row.unite,
        row.lecons,
      ]),
    ];

    worksheet.addRows(rows);
    [12, 15, 15, 30, 85].forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });
    worksheet.eachRow((row, index) => {
      row.alignment = { vertical: "top", wrapText: true };
      if (index === 7) row.font = { bold: true };
      if (index > 7) {
        const entry = repartition[index - 8];
        row.height = Math.max(30, Math.ceil(entry.lecons.length / 70) * 16, Math.ceil(entry.unite.length / 25) * 16);
        if (entry.unite === "Vacances scolaires") {
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          });
        }
      }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fileSaver.saveAs(blob, `repartition-${niveau}-${annee}.xlsx`);
  }

  async function downloadWord() {
    if (repartition.length === 0) {
      return;
    }

    const [docx, fileSaver] = await Promise.all([
      import("docx"),
      import("file-saver"),
    ]);
    const {
      Document,
      Packer,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      WidthType,
    } = docx;

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        "Semaine",
        "Du",
        "Au",
        "Unité",
        "Leçons",
      ].map(
        (text) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    bold: true,
                  }),
                ],
              }),
            ],
          })
      ),
    });

    const dataRows = repartition.map((row) => {
      const isVacation = row.unite === "Vacances scolaires";

      return (
        new TableRow({
          children: [
            `S${row.semaine}`,
            row.debut,
            row.fin,
            row.unite,
            row.lecons,
          ].map(
            (text) =>
              new TableCell({
                shading: isVacation ? { fill: "FEF3C7" } : undefined,
                children: [
                  new Paragraph(text),
                ],
              })
          ),
        })
      );
    });

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [headerRow, ...dataRows],
    });

    const document = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { orientation: docx.PageOrientation.LANDSCAPE, width: 11906, height: 16838 },
              margin: { top: 720, right: 720, bottom: 720, left: 720 },
            },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Répartition ${type}`,
                  bold: true,
                  size: 32,
                }),
              ],
            }),

            new Paragraph({
              text: `${pays} — ${niveau} — ${annee}`,
            }),

            new Paragraph({
              text: "",
            }),

            table,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(document);

    fileSaver.saveAs(
      blob,
      `repartition-${niveau}-${annee}.docx`
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/repartition"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Choisir un autre type de répartition
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-slate-900">
          Créer une répartition
        </h1>

        <p className="mt-2 text-slate-600">
          Préparez votre répartition annuelle ou périodique.
        </p>

        <Link href="/repartitions" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
          Voir l’historique des répartitions
        </Link>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Type de répartition
          </h2>

          <div className="mt-4 flex gap-4">
            <button type="button" className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white">
              Annuelle
            </button>

            <button
              type="button"
              disabled
              title="Fonctionnalité à venir"
              className="cursor-not-allowed rounded-xl bg-slate-100 px-5 py-3 font-medium text-slate-400"
            >
              Périodique — bientôt
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Informations scolaires
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Pays
              </label>

              <select
                value={pays}
                onChange={(e) =>
                  setPays(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option>Maroc</option>
                <option>France</option>
                <option>Belgique</option>
                <option>Canada</option>
                <option>
                  Autre pays francophone
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Année scolaire
              </label>

              <select
                value={annee}
                onChange={(e) =>
                  setAnnee(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option>2026-2027</option>
                <option>2027-2028</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Niveau
              </label>

              <select
                value={niveau}
                onChange={(e) =>
                  setNiveau(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option>CP</option>
                <option>CE1</option>
                <option>CE2</option>
                <option>CM1</option>
                <option>CM2</option>
                <option>CE6</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Vacances scolaires
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Importez votre calendrier scolaire ou saisissez les vacances.
          </p>

          <div className="mt-5 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
            <p className="font-medium">
              Importer le calendrier scolaire
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Formats acceptés : PDF ou DOCX (10 Mo maximum)
            </p>

            <label className="mt-4 inline-block cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-medium text-white">
              Choisir un fichier

              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleVacancesFile}
                disabled={importing !== null}
                className="hidden"
              />
            </label>

            {vacancesFileName && !importError.vacances && (
              <p className="mt-4 text-sm text-green-700">
                {importing === "vacances" ? "Lecture en cours :" : "Fichier importé :"}{" "}
                <strong>
                  {vacancesFileName}
                </strong>
              </p>
            )}

            {importError.vacances && (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {importError.vacances}
              </p>
            )}
          </div>

          <textarea
            value={vacances}
            onChange={(e) =>
              setVacances(e.target.value)
            }
            rows={5}
            placeholder={`Exemple :
18/10/2026 au 25/10/2026
06/12/2026 au 13/12/2026`}
            className="mt-5 w-full rounded-xl border p-4"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Programme et leçons
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Importez le sommaire ou saisissez toutes les unités et les leçons.
          </p>

          <div className="mt-5 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
            <p className="font-medium">
              Importer le sommaire
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Formats acceptés : PDF ou DOCX (10 Mo maximum)
            </p>

            <label className="mt-4 inline-block cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-medium text-white">
              Choisir un fichier

              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleSommaireFile}
                disabled={importing !== null}
                className="hidden"
              />
            </label>

            {sommaireFileName && !importError.sommaire && (
              <p className="mt-4 text-sm text-green-700">
                {importing === "sommaire" ? "Lecture en cours :" : "Fichier importé :"}{" "}
                <strong>
                  {sommaireFileName}
                </strong>
              </p>
            )}

            {importError.sommaire && (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {importError.sommaire}
              </p>
            )}
          </div>

          <textarea
            value={sommaire}
            onChange={(e) =>
              setSommaire(e.target.value)
            }
            rows={16}
            placeholder={`Unité 1
Leçon 1 : Nombres entiers
Leçon 2 : Addition
Leçon 3 : Soustraction

Unité 2
Leçon 1 : Multiplication
Leçon 2 : Division

Unité 3
Leçon 1 : Fractions
Leçon 2 : Nombres décimaux`}
            className="mt-5 w-full rounded-xl border p-4"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Rythme de travail
          </h2>

          <label className="mt-4 block text-sm font-medium">
            Nombre de leçons par semaine
          </label>

          <select
            value={leconsParSemaine}
            onChange={(e) =>
              setLeconsParSemaine(
                Number(e.target.value)
              )
            }
            className="mt-2 rounded-xl border p-3"
          >
            <option value={1}>1 leçon</option>
            <option value={2}>2 leçons</option>
            <option value={3}>3 leçons</option>
            <option value={4}>4 leçons</option>
            <option value={5}>5 leçons</option>
          </select>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={generateRepartition}
            className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700"
          >
            Générer ma répartition
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-center text-blue-800">
            {message}
          </div>
        )}

        {repartition.length > 0 && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">
              Répartition {type}
            </h2>

            <p className="mt-1 text-slate-600">
              {pays} — {niveau} — {annee}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Semaines de vacances conservées sans leçons. Exports Word et Excel au format A4 paysage.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border p-3">
                      Semaine
                    </th>
                    <th className="border p-3">
                      Du
                    </th>
                    <th className="border p-3">
                      Au
                    </th>
                    <th className="border p-3">
                      Unité
                    </th>
                    <th className="border p-3">
                      Leçons
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {repartition.map((row) => (
                    <tr key={row.semaine} className={row.unite === "Vacances scolaires" ? "bg-amber-50" : undefined}>
                      <td className="border p-3 font-medium">
                        S{row.semaine}
                      </td>

                      <td className="border p-3">
                        {row.debut}
                      </td>

                      <td className="border p-3">
                        {row.fin}
                      </td>

                      <td className="border p-3">
                        {row.unite}
                      </td>

                      <td className="border p-3">
                        {row.lecons}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => void saveRepartition()}
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : savedId ? "Enregistrer les modifications" : "Enregistrer la répartition"}
              </button>

              <button
                onClick={downloadExcel}
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
              >
                Télécharger en Excel (paysage)
              </button>

              <button
                onClick={downloadWord}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Télécharger en Word (paysage)
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
