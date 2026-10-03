export type Level = 'CM1' | 'CM2';
export type Difficulty = 'soutien' | 'standard' | 'defi';
export type ExerciseType = 'words' | 'decompose' | 'order' | 'round' | 'divisors' | 'fraction' | 'quantity' | 'product-fraction' | 'decimal-fraction' | 'convert' | 'decimal' | 'add' | 'subtract' | 'multiply' | 'divide';
export type Rules = { min: number; max: number; decimals: number; denominators: readonly number[]; carries: boolean; steps: number; factorMax: number };
export type Skill = { slug: string; title: string; level: Level; domain: string; description: string; types: readonly ExerciseType[]; rules: Record<Difficulty, Rules> };
export type Parameters = { level: 'CM2'; subject: 'Mathématiques'; skill: string; difficulty: Difficulty; count: number; duration: number; example: boolean; correction: boolean; spaces: boolean; pages: 1 | 2 };
// Integers only: scale is the power of ten used for decimal operands.
export type ExerciseData = { values: number[]; scale: number };
export type Answer = { text: string; equivalent: string[]; values: number[]; fraction?: { numerator: number; denominator: number } };
export type Exercise = { id: string; type: ExerciseType; statement: string; data: ExerciseData; answer: Answer; explanation: string };
export type Sheet = { formatVersion: 1; generatorVersion: string; title: string; parameters: Parameters; exercises: Exercise[]; example: Exercise | null };
export type SheetRecord = { id: string; snapshot: Sheet; revision: number; savedAt: string | null; createdAt: string; updatedAt: string };
