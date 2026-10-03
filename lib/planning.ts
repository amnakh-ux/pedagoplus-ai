export type Period = { start: string; end: string };
export type PlanningRow = { semaine: number; debut: string; fin: string; unite: string; lecons: string; sessions: number };
export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(iso+"T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? date : null;
}
export function frenchDate(date: Date) { return date.toLocaleDateString("fr-FR", { timeZone: "UTC" }); }
export function parsePeriods(text: string): Period[] {
  const periods = text.split(/\n/).map(s => s.trim()).filter(Boolean).map(line => {
    const match = /^(\d{2}\/\d{2}\/\d{4})\s*(?:au|-)\s*(\d{2}\/\d{2}\/\d{4})$/.exec(line);
    const start = match && parseDate(match[1]); const end = match && parseDate(match[2]);
    if (!start || !end || start > end) throw new Error("Congés : utilisez une période valide JJ/MM/AAAA au JJ/MM/AAAA par ligne.");
    return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
  }).sort((a,b) => a.start.localeCompare(b.start));
  if (periods.some((p,i) => i > 0 && p.start <= periods[i-1].end)) throw new Error("Les périodes non travaillées se chevauchent.");
  return periods;
}
export function capacity(start: Date, end: Date, periods: Period[], weekly: number) {
  let days = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t), iso = d.toISOString().slice(0,10);
    if (d.getUTCDay() > 0 && d.getUTCDay() < 6 && !periods.some(p => iso >= p.start && iso <= p.end)) days++;
  }
  return Math.floor(weekly * days / 5);
}
export function generatePlanning(startValue: string, endValue: string, weekly: number, vacations: string, lessons: { unite: string; lecon: string }[]) {
  const start = parseDate(startValue), end = parseDate(endValue);
  if (!start || !end || start > end || end.getTime()-start.getTime() > 366*86400000) throw new Error("Choisissez une période scolaire valide de 366 jours maximum.");
  if (!Number.isInteger(weekly) || weekly < 1 || weekly > 40) throw new Error("Prévoyez de 1 à 40 séances par semaine.");
  const periods = parsePeriods(vacations);
  if (periods.some(p => p.start < startValue || p.end > endValue)) throw new Error("Les congés doivent être compris dans les dates de l’année.");
  const rows: PlanningRow[] = []; let index = 0;
  const monday = new Date(start); monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
  for (let t = monday.getTime(); t <= end.getTime(); t += 7*86400000) {
    const from = new Date(Math.max(t,start.getTime())); const to = new Date(Math.min(t+4*86400000,end.getTime()));
    if (from > to) continue;
    const slots = capacity(from,to,periods,weekly); const batch = lessons.slice(index,index+slots); index += batch.length;
    rows.push({ semaine: rows.length+1, debut: frenchDate(from), fin: frenchDate(to), unite: batch.length ? [...new Set(batch.map(l=>l.unite))].join(" / ") : slots ? "Programme terminé" : "Période non travaillée", lecons: batch.length ? batch.map(l=>l.lecon).join(" • ") : "Aucune leçon à planifier", sessions: batch.length });
  }
  if (index < lessons.length) throw new Error("Charge excessive : "+(lessons.length-index)+" leçon(s) ne tiennent pas dans les "+index+" séances disponibles. Ajustez les dates ou le rythme.");
  return rows;
}
