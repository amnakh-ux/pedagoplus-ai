import { getSkill } from './catalog';
import type { ExerciseData, Parameters } from './types';
export class ExerciseError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function parameters(value: unknown): Parameters {
  if (!value || typeof value !== 'object') throw new ExerciseError('Paramètres manquants.');
  const p = value as Parameters;
  if (p.level !== 'CM2' || p.subject !== 'Mathématiques' || !getSkill(p.skill)) throw new ExerciseError('Choisissez une compétence de mathématiques CM2.');
  if (!['soutien', 'standard', 'defi'].includes(p.difficulty)) throw new ExerciseError('Difficulté invalide.');
  if (!Number.isInteger(p.count) || p.count < 3 || p.count > 6) throw new ExerciseError('Choisissez de 3 à 6 exercices.');
  if (!Number.isInteger(p.duration) || p.duration < 5 || p.duration > 120) throw new ExerciseError('La durée doit être comprise entre 5 et 120 minutes.');
  if (![1, 2].includes(p.pages) || ['example','correction','spaces'].some(k => typeof p[k as keyof Parameters] !== 'boolean')) throw new ExerciseError('Options de mise en page invalides.');
  return { level: 'CM2', subject: 'Mathématiques', skill: p.skill, difficulty: p.difficulty, count: p.count, duration: p.duration, pages: p.pages, example: p.example, correction: p.correction, spaces: p.spaces };
}
export function data(value: unknown): ExerciseData {
  if (!value || typeof value !== 'object') throw new ExerciseError('Données mathématiques manquantes.');
  const d = value as ExerciseData;
  if (!Array.isArray(d.values) || !d.values.length || d.values.length > 3 || d.values.some(n => !Number.isSafeInteger(n) || n < 0 || n > 999999999) || !Number.isInteger(d.scale) || d.scale < 0 || d.scale > 3) throw new ExerciseError('Utilisez des entiers positifs dans les bornes de la compétence.');
  return { values: [...d.values], scale: d.scale };
}
