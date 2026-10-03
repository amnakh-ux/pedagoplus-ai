"use client";

import Link from "next/link";
import { generatePlanning, frenchDate, parseDate, type PlanningRow } from "@/lib/planning";
import { useEffect, useRef, useState } from "react";

type Lesson = {
  unite: string;
  lecon: string;
};

type RepartitionRow = PlanningRow;
type ClassItem = { id:string; name:string; level:string; country:string; schoolYear:string };

type ImportTarget = "vacances" | "sommaire";

const MAX_BROWSER_OCR_PAGES = 20;

type StoredRepartition = {
  id: string;
  type: string;
  country: string;
  schoolYear: string;
  level: string;
  lessonsPerWeek: number;
  classId: string | null;
  startDate: string | null;
  endDate: string | null;
  sessionMinutes: number;
  vacations: string;
  syllabus: string;
  validatedAt: string | null;
  rows: Array<{ week: number; startDate: string; endDate: string; unit: string; lessons: string; sessions: number }>;
};

export default function RepartitionPage() {
  const type = "annuelle";
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2027-06-30");
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [validated, setValidated] = useState(false);
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
  const savingRef = useRef(false);
  const revision = useRef(0);
  const validatedRef = useRef(false);

  function setValidation(value: boolean) {
    validatedRef.current = value;
    setValidated(value);
  }

  function invalidateValidation() {
    revision.current += 1;
    setValidation(false);
    setMessage("Brouillon modifié. Validez et enregistrez avant d’imprimer ou d’exporter.");
  }

  function canExport() {
    return validatedRef.current && !savingRef.current && importing === null;
  }

  const exportDisabled = !validated || saving || importing !== null;

  useEffect(() => {
    void fetch("/api/classes").then(async response => {
      if (!response.ok) throw new Error("Impossible de charger les classes.");
      setClasses(await response.json());
    }).catch(error => setMessage(error.message));
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    void fetch(`/api/repartitions/${id}`).then(async (response) => {
      const data = (await response.json()) as StoredRepartition & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Impossible d’ouvrir cette répartition.");
      const date = (value: string) => frenchDate(new Date(value));
      setClassId(data.classId ?? "");
      setStartDate(data.startDate?.slice(0,10) ?? data.rows[0]?.startDate.slice(0,10) ?? "");
      setEndDate(data.endDate?.slice(0,10) ?? data.rows.at(-1)?.endDate.slice(0,10) ?? "");
      setSessionMinutes(data.sessionMinutes ?? 45);
      setVacances(data.vacations ?? "");
      setSommaire(data.syllabus ?? "");
      setValidation(Boolean(data.validatedAt));
      setPays(data.country);
      setAnnee(data.schoolYear);
      setNiveau(data.level);
      setLeconsParSemaine(data.lessonsPerWeek);
      setRepartition(data.rows.map((row) => ({ semaine: row.week, debut: date(row.startDate), fin: date(row.endDate), unite: row.unit, lecons: row.lessons, sessions: row.sessions ?? 0 })));
      setSavedId(data.id);
      setMessage("Répartition chargée depuis l’historique.");
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Impossible d’ouvrir cette répartition."));
  }, []);

  async function saveRepartition(confirmValidation = false) {
    if (repartition.length === 0 || savingRef.current || importing !== null) return;
    savingRef.current = true;
    const savedRevision = revision.current;
    setSaving(true);
    try {
      const response = await fetch(savedId ? `/api/repartitions/${savedId}` : "/api/repartitions", {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, classId, startDate, endDate, sessionMinutes, vacations: vacances, syllabus: sommaire, validated: confirmValidation,
          country: pays,
          schoolYear: annee,
          level: niveau,
          lessonsPerWeek: leconsParSemaine,
          rows: repartition.map((row) => ({ week: row.semaine, startDate: row.debut, endDate: row.fin, unit: row.unite, lessons: row.lecons, sessions: row.sessions })),
        }),
      });
      const data = (await response.json()) as { id?: string; validatedAt?: string | null; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "L’enregistrement a échoué.");
      setSavedId(data.id);
      setValidation(savedRevision === revision.current && Boolean(data.validatedAt));
      window.history.replaceState(null, "", "/repartition/lecons?id="+data.id);
      setMessage(savedId ? "Répartition modifiée avec succès." : "Répartition enregistrée avec succès.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "L’enregistrement a échoué.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function importDocument(file: File, target: ImportTarget) {
    invalidateValidation();
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

      setRepartition([]);
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

  function generateRepartition() {
    invalidateValidation();
    try {
      if (!classId) throw new Error("Créez puis choisissez une classe avant de générer.");
      const lessons = extractLessons();
      if (!lessons.length) throw new Error("Ajoutez les unités et les leçons.");
      const rows = generatePlanning(startDate,endDate,leconsParSemaine,vacances,lessons);
      setRepartition(rows);
      setMessage("Aperçu généré. Vérifiez les séances, modifiez si nécessaire, puis validez et enregistrez.");
    } catch(error) {setRepartition([]);setMessage(error instanceof Error ? error.message : "Génération impossible.");}
  }

  async function downloadExcel() {
    if (repartition.length === 0 || !canExport()) {
      return;
    }

    const exportedRevision = revision.current;
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

    if (canExport() && exportedRevision === revision.current) {
      fileSaver.saveAs(blob, `repartition-${niveau}-${annee}.xlsx`);
    }
  }

  async function downloadWord() {
    if (repartition.length === 0 || !canExport()) {
      return;
    }

    const exportedRevision = revision.current;
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

    if (!canExport() || exportedRevision !== revision.current) return;
    fileSaver.saveAs(
      blob,
      `repartition-${niveau}-${annee}.docx`
    );
  }

  return (
    <main className="planning-page min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8" onChangeCapture={event => {
      invalidateValidation();
      if (!(event.target as HTMLElement).closest(".planning-preview")) setRepartition([]);
    }}>
      <div className="mx-auto max-w-5xl"><fieldset disabled={saving || importing !== null} className="contents">
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
          <label className="block font-medium">Classe
            <select value={classId} onChange={e=>{
              setClassId(e.target.value); const selected=classes.find(c=>c.id===e.target.value);
              if(selected){setPays(selected.country);setNiveau(selected.level);setAnnee(selected.schoolYear);setStartDate(selected.schoolYear.slice(0,4)+"-09-01");setEndDate(selected.schoolYear.slice(5)+"-06-30");}
            }} className="mt-2 w-full rounded-xl border p-3">
              <option value="">Choisir une classe</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} — {c.level} — {c.schoolYear}</option>)}
            </select>
          </label>
          <Link href="/parametres" className="mt-2 inline-block text-blue-700 underline">Créer ou modifier mes classes</Link>
          <div className="my-4 grid gap-4 sm:grid-cols-3">
            <label>Début de l’année<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-2 w-full rounded border p-3"/></label>
            <label>Fin de l’année<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="mt-2 w-full rounded border p-3"/></label>
            <label>Durée d’une séance (minutes)<input type="number" min={5} max={180} value={sessionMinutes} onChange={e=>setSessionMinutes(Number(e.target.value))} className="mt-2 w-full rounded border p-3"/></label>
          </div>
          <h2 className="text-lg font-semibold">
            Informations scolaires
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Pays
              </label>

              <select
                aria-label="Pays" disabled value={pays}
                onChange={(e) =>
                  setPays(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option>{pays}</option>
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
                aria-label="Année scolaire" disabled value={annee}
                onChange={(e) =>
                  setAnnee(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option>{annee}</option>
                <option>2027-2028</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Niveau
              </label>

              <select
                aria-label="Niveau" disabled value={niveau}
                onChange={(e) =>
                  setNiveau(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option>CM1</option>
                <option>CM2</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Vacances scolaires
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Saisissez une période par ligne (JJ/MM/AAAA au JJ/MM/AAAA). Après un import, corrigez le texte pour respecter ce format. Aucun calendrier officiel n’est appliqué.
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
            aria-label="Périodes non travaillées" value={vacances}
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
            aria-label="Unités et leçons" value={sommaire}
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
            aria-label="Nombre de séances par semaine" value={leconsParSemaine}
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

        <p className="mt-4 text-sm text-slate-600">Base de calcul : lundi à vendredi. Les semaines partielles sont calculées au prorata des jours disponibles, arrondi à l’entier inférieur.</p>
        <div className="mt-8 text-center">
          <button
            onClick={generateRepartition}
            className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700"
          >
            Générer ma répartition
          </button>
        </div>

        {message && (
          <div role="status" aria-live="polite" className="mt-6 rounded-xl bg-blue-50 p-4 text-center text-blue-800">
            {message}
          </div>
        )}

        {repartition.length > 0 && (
          <div className="planning-preview mt-8 rounded-2xl bg-white p-4 shadow-sm sm:p-6" data-validated={!exportDisabled}>
            <h2 className="text-2xl font-bold">
              Répartition {type}<span className="print-value"> — {niveau} — {annee}</span>
            </h2>

            <p className="no-print mt-1 text-slate-600">
              {pays} — {niveau} — {annee}
            </p>
            <p className="no-print mt-2 text-sm text-slate-600">
              {validated ? "Version validée et enregistrée" : "Brouillon à vérifier"} — Séances de {sessionMinutes} minutes. <span className="no-print">PDF : choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.</span>
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100"><th className="border p-3">Mois</th><th className="border p-3">Séances</th>
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
                      <td className="border p-3">{parseDate(row.debut)?.toLocaleDateString("fr-FR",{month:"long",timeZone:"UTC"})}</td>
                      <td className="border p-3"><span className="print-value">{row.sessions}</span><input aria-label={"Séances semaine "+row.semaine} type="number" min={0} max={40} value={row.sessions} onChange={e=>setRepartition(old=>old.map(r=>r.semaine===row.semaine?{...r,sessions:Number(e.target.value)}:r))} className="w-16 rounded border p-1"/></td>
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
                        <span className="print-value">{row.unite}</span><textarea aria-label={"Unité semaine "+row.semaine} maxLength={300} value={row.unite} onChange={e=>setRepartition(old=>old.map(r=>r.semaine===row.semaine?{...r,unite:e.target.value}:r))} className="min-w-28 w-full rounded border p-1"/>
                      </td>

                      <td className="border p-3">
                        <span className="print-value">{row.lecons}</span><textarea aria-label={"Leçons semaine "+row.semaine} maxLength={5000} rows={4} value={row.lecons} onChange={e=>setRepartition(old=>old.map(r=>r.semaine===row.semaine?{...r,lecons:e.target.value}:r))} className="min-w-52 w-full rounded border p-1"/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="no-print mt-8 flex flex-wrap gap-4">
              <button disabled={saving} onClick={()=>void saveRepartition(true)} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50">Valider et enregistrer</button>
              <button disabled={exportDisabled} onClick={()=>{if(canExport()) window.print();}} className="rounded-xl border px-6 py-3 disabled:opacity-50">Exporter le PDF A4</button>
              <button
                type="button"
                onClick={() => void saveRepartition()}
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
              </button>

              <button
                onClick={downloadExcel}
                disabled={exportDisabled}
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
              >
                Télécharger en Excel (paysage)
              </button>

              <button
                onClick={downloadWord}
                disabled={exportDisabled}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Télécharger en Word (paysage)
              </button>
            </div>
          </div>
        )}
      </fieldset></div>
      <p className="print-blocked" role="status">Cette répartition doit être validée et enregistrée avant impression.</p>
    </main>
  );
}
