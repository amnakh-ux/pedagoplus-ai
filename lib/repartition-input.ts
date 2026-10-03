import { parseDate, parsePeriods, capacity } from "./planning";
import { text, schoolYear } from "./profile-input";

export function validateRepartitionInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.type !== "annuelle" || !text(v.country,80) || !schoolYear(v.schoolYear) || !["CM1","CM2"].includes(String(v.level)) || !Number.isInteger(v.lessonsPerWeek) || Number(v.lessonsPerWeek)<1 || Number(v.lessonsPerWeek)>40 || !text(v.classId) || !Array.isArray(v.rows) || !v.rows.length || v.rows.length>54) return null;
  const startDate = parseDate(v.startDate), endDate = parseDate(v.endDate);
  if (!startDate || !endDate || startDate>endDate || endDate.getTime()-startDate.getTime()>366*86400000 || startDate.getUTCFullYear()!==Number(v.schoolYear.slice(0,4)) || endDate.getUTCFullYear()>Number(v.schoolYear.slice(5))) return null;
  if (!Number.isInteger(v.sessionMinutes) || Number(v.sessionMinutes)<5 || Number(v.sessionMinutes)>180 || typeof v.vacations!=="string" || v.vacations.length>10000 || typeof v.syllabus!=="string" || v.syllabus.length>100000 || typeof v.validated!=="boolean") return null;
  try {
    const periods = parsePeriods(v.vacations);
    if (periods.some(p=>p.start<startDate.toISOString().slice(0,10)||p.end>endDate.toISOString().slice(0,10))) return null;
    const rows = v.rows.map((row: unknown) => {
      if (!row || typeof row!=="object") return null;
      const r = row as Record<string,unknown>, start = parseDate(r.startDate), end = parseDate(r.endDate);
      if (!Number.isInteger(r.week) || Number(r.week)<1 || Number(r.week)>54 || !start || !end || start>end || start<startDate || end>endDate || end.getTime()-start.getTime()>6*86400000 || !text(r.unit,300) || !text(r.lessons,5000) || !Number.isInteger(r.sessions) || Number(r.sessions)<0 || Number(r.sessions)>capacity(start,end,periods,Number(v.lessonsPerWeek))) return null;
      return { week: Number(r.week), startDate:start, endDate:end, unit:r.unit.trim(), lessons:r.lessons.trim(), sessions:Number(r.sessions) };
    });
    if (rows.some(r=>r===null)) return null;
    const valid = rows as NonNullable<typeof rows[number]>[];
    valid.sort((a,b)=>a.week-b.week);
    if (valid.some((r,i)=>i>0 && (r.week===valid[i-1].week || r.startDate<=valid[i-1].endDate))) return null;
    return { type:"annuelle", country:v.country.trim(), schoolYear:v.schoolYear, level:String(v.level), lessonsPerWeek:Number(v.lessonsPerWeek), classId:v.classId, startDate,endDate, sessionMinutes:Number(v.sessionMinutes), vacations:v.vacations,syllabus:v.syllabus,validatedAt:v.validated?new Date():null, rows:valid };
  } catch { return null; }
}
