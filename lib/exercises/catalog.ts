import type { ExerciseType, Rules, Skill } from './types';
export const DIFFICULTIES = { soutien: 'Soutien', standard: 'Standard', defi: 'Défi' } as const;
const rules = (max: number, decimals: number, denominators: readonly number[], carries: boolean, steps: number, factorMax: number): Rules => ({ min: 1, max, decimals, denominators, carries, steps, factorMax });
const integers = { soutien: rules(9999, 0, [2, 4], false, 1, 9), standard: rules(999999, 0, [2, 3, 4, 5, 8, 10], true, 1, 99), defi: rules(999999999, 0, [3, 4, 5, 8, 10, 12], true, 2, 999) };
const fractions = { soutien: rules(40, 0, [2, 4], false, 1, 5), standard: rules(120, 0, [2, 3, 4, 5, 8, 10], true, 1, 10), defi: rules(360, 0, [3, 4, 5, 8, 10, 12], true, 2, 20) };
const decimals = { soutien: rules(99, 1, [10], false, 1, 9), standard: rules(9999, 2, [10, 100], true, 1, 99), defi: rules(999999, 3, [10, 100, 1000], true, 2, 999) };
const operations = { soutien: rules(999, 0, [2, 4], false, 1, 9), standard: rules(9999, 0, [2, 4, 5], true, 1, 99), defi: rules(99999, 0, [2, 4, 5, 10], true, 2, 999) };
const skill = (slug: string, title: string, domain: string, type: ExerciseType, difficulty: Skill['rules'], description: string): Skill => ({ slug, title, level: 'CM2', domain, description, types: [type], rules: difficulty });
export const SKILLS: readonly Skill[] = [
  skill('grands-nombres', 'Lire et écrire les grands nombres', 'Nombres entiers', 'words', integers, 'Écrire en lettres selon l’orthographe traditionnelle ; Défi : écrire aussi le successeur.'),
  skill('decomposition', 'Décomposer et recomposer les grands nombres', 'Nombres entiers', 'decompose', integers, 'Décomposer par valeurs de position ; Défi : recomposer le successeur.'),
  skill('comparaison', 'Comparer, ranger et encadrer les grands nombres', 'Nombres entiers', 'order', integers, 'Ranger trois nombres distincts et encadrer strictement le nombre central entre deux dizaines ; Défi : deux centaines.'),
  skill('arrondi', 'Arrondir un nombre entier', 'Nombres entiers', 'round', integers, 'Arrondi à la dizaine (Soutien), centaine (Standard), millier puis dizaine de milliers (Défi). À mi-chemin, arrondir au multiple supérieur.'),
  skill('multiples-diviseurs', 'Multiples et diviseurs', 'Nombres entiers', 'divisors', fractions, 'Lister les diviseurs positifs ; Défi : donner aussi les trois premiers multiples strictement positifs.'),
  skill('fractions-simples', 'Fractions simples', 'Fractions', 'fraction', fractions, 'Identifier une fraction propre d’une collection ; Défi : écrire aussi la fraction complémentaire.'),
  skill('fraction-quantite', 'Fraction d’une quantité', 'Fractions', 'quantity', fractions, 'Quantité divisible par le dénominateur, résultat entier ; Défi : calculer aussi la quantité restante.'),
  skill('entier-fraction', 'Multiplier un entier par une fraction', 'Fractions', 'product-fraction', fractions, 'Multiplier puis simplifier ; Défi : écrire aussi sous forme d’un entier et d’une fraction propre.'),
  skill('fractions-decimales', 'Fractions décimales', 'Fractions', 'decimal-fraction', decimals, 'Écrire une quantité de dixièmes/centièmes/millièmes en fraction décimale ; Défi : décomposer aussi en unités et reste.'),
  skill('fraction-vers-decimal', 'Passer d’une fraction décimale à un nombre décimal', 'Nombres décimaux', 'convert', decimals, 'Convertir exactement avec des entiers mis à l’échelle ; Défi : décomposer aussi par positions.'),
  skill('nombres-decimaux', 'Lire, écrire et décomposer les nombres décimaux', 'Nombres décimaux', 'decimal', decimals, 'Écriture en lettres et décomposition par positions, avec une à trois décimales.'),
  skill('addition', 'Addition posée', 'Calcul', 'add', operations, 'Deux termes ; Soutien : sans retenue ; Standard : retenues autorisées ; Défi : trois termes.'),
  skill('soustraction', 'Soustraction posée', 'Calcul', 'subtract', operations, 'Résultat positif ; Soutien : sans emprunt ; Standard : emprunts autorisés ; Défi : deux soustractions successives.'),
  skill('multiplication', 'Multiplication', 'Calcul', 'multiply', operations, 'Soutien : table à un chiffre ; Standard : multiplicateur à deux chiffres ; Défi : multiplicateur à trois chiffres.'),
  skill('division', 'Division', 'Calcul', 'divide', operations, 'Division euclidienne : Soutien exacte avec diviseur à un chiffre ; Standard diviseur à deux chiffres et reste ; Défi diviseur à trois chiffres et vérification.'),
];
export function getSkill(slug: string) { return SKILLS.find(s => s.slug === slug); }
