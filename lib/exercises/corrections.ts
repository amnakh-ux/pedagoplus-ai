import { getSkill } from './catalog';
import { data, ExerciseError } from './validation';
import { decimalText, decompose, fraction, fractionText, numberWords, roundInteger, strictBounds } from './math';
import type { Answer, Exercise, ExerciseData, Parameters } from './types';

function noCarry(a: number, b: number, subtract = false) {
  while (a || b) { if (subtract ? a % 10 < b % 10 : a % 10 + b % 10 >= 10) return false; a = Math.floor(a / 10); b = Math.floor(b / 10); } return true;
}
export function correct(id: string, p: Parameters, input: ExerciseData): Exercise {
  const skill = getSkill(p.skill)!;
  const type = skill.types[0], r = skill.rules[p.difficulty], d = data(input);
  const [a, b, c] = d.values, challenge = r.steps === 2;
  const size = type === 'order' || ((type === 'add' || type === 'subtract') && challenge) ? 3 : ['fraction','quantity','product-fraction','multiply','divide'].includes(type) || type === 'add' || type === 'subtract' ? 2 : 1;
  if (d.values.length !== size || a < 1 || a > r.max || d.scale !== (['decimal-fraction','convert','decimal'].includes(type) ? r.decimals : 0)) throw new ExerciseError('Données incompatibles avec la compétence ou la difficulté.');
  if (['order','add','subtract'].includes(type) && d.values.some(n => n < 1 || n > r.max)) throw new ExerciseError('Un nombre dépasse les bornes de difficulté.');
  if (['fraction','quantity','product-fraction'].includes(type) && (!r.denominators.includes(b) || (type !== 'product-fraction' && a > (type === 'fraction' ? b - 1 : r.max)))) throw new ExerciseError('Dénominateur ou numérateur hors limites.');
  if (type === 'quantity' && a % b !== 0) throw new ExerciseError('La quantité doit être divisible par le dénominateur.');
  if (['multiply','divide'].includes(type) && (b < 2 || b > r.factorMax)) throw new ExerciseError('Multiplicateur ou diviseur hors limites.');
  if (type === 'multiply' && !r.carries && (a > 9 || a * b > 81)) throw new ExerciseError('Soutien : utilisez une table à un chiffre.');
  if ((type === 'add' || type === 'subtract') && !r.carries && !noCarry(a, b, type === 'subtract')) throw new ExerciseError('Soutien : retenues et emprunts ne sont pas autorisés.');
  if (type === 'subtract' && a - b - (challenge ? c : 0) <= 0) throw new ExerciseError('La soustraction doit avoir un résultat strictement positif.');
  if (type === 'divide' && !r.carries && a % b !== 0) throw new ExerciseError('Soutien : la division doit être exacte.');
  let statement = '', text = '', explanation = ''; let values: number[] = [], rational: Answer['fraction'];
  switch (type) {
    case 'words': statement = `Écris ${a} en lettres.${challenge ? ' Écris aussi son successeur en chiffres.' : ''}`; text = numberWords(a) + (challenge ? ` ; successeur : ${a + 1}` : ''); values = challenge ? [a + 1] : [a]; explanation = 'Sépare les classes des millions, des milliers et des unités. Mille est invariable ; cent et vingt prennent un s seulement en fin de groupe sans nombre suivant.'; break;
    case 'decompose': statement = `Décompose ${a} par valeurs de position.${challenge ? ' Recompose ensuite son successeur.' : ''}`; text = decompose(a) + (challenge ? ` ; ${decompose(a + 1)} = ${a + 1}` : ''); values = [a]; explanation = 'Chaque chiffre est multiplié par la valeur de sa position.'; break;
    case 'order': {
      if (new Set(d.values).size !== 3) throw new ExerciseError('Les trois nombres doivent être distincts.');
      const sorted = [...d.values].sort((x,y) => x-y), step = challenge ? 100 : 10, bounds = strictBounds(sorted[1], step);
      statement = `Range ${a}, ${b} et ${c} dans l’ordre croissant. Encadre ensuite le nombre central strictement entre deux ${step === 10 ? 'dizaines' : 'centaines'} consécutives (ou voisines si c’est un multiple).`;
      text = sorted.join(' < ') + ` ; ${bounds[0]} < ${sorted[1]} < ${bounds[1]}`; values = [...sorted,...bounds]; explanation = 'Compare les positions de gauche à droite. Si le nombre est un multiple, prends le multiple précédent et le suivant pour garder des inégalités strictes.'; break;
    }
    case 'round': {
      const step = p.difficulty === 'soutien' ? 10 : challenge ? 1000 : 100;
      statement = `Arrondis ${a} au multiple de ${step} le plus proche${challenge ? ', puis au multiple de 10000 le plus proche' : ''}. À mi-chemin, choisis le multiple supérieur.`;
      values = [roundInteger(a,step), ...(challenge ? [roundInteger(a,10000)] : [])]; text = values.join(' ; '); explanation = `Compare la distance aux multiples voisins de ${step}. La moitié est arrondie vers le haut.`; break;
    }
    case 'divisors': {
      const divisors = Array.from({length:a},(_,i)=>i+1).filter(n=>a%n===0); values = divisors;
      statement = `Liste tous les diviseurs positifs de ${a}.${challenge ? ' Donne aussi ses trois premiers multiples strictement positifs.' : ''}`;
      text = divisors.join(', ') + (challenge ? ` ; multiples : ${a}, ${2*a}, ${3*a}` : ''); explanation = 'Un diviseur donne une division exacte. Les multiples s’obtiennent en multipliant par 1, 2, 3…'; break;
    }
    case 'fraction': statement = `${a} ${a===1?'part est coloriée':'parts sont coloriées'} parmi ${b} parts égales. Écris la fraction coloriée${challenge ? ' et la fraction non coloriée' : ''}.`; rational = fraction(a,b); values = [a,b]; text = `${a}/${b}` + (challenge ? ` ; ${(b-a)}/${b}` : ''); explanation = 'Le dénominateur compte toutes les parts ; le numérateur compte les parts choisies.'; break;
    case 'quantity': {
      // Numerator is fixed by difficulty so editing quantity/denominator cannot invalidate it.
      const numerator = p.difficulty === 'soutien' ? 1 : Math.max(1,b-1), result = a / b * numerator;
      statement = `Calcule ${numerator}/${b} de ${a}.${challenge ? ' Calcule aussi la quantité restante.' : ''}`; values = [result,...(challenge ? [a-result] : [])]; text = values.join(' ; reste : '); explanation = `${a} ÷ ${b} × ${numerator} = ${result}.` + (challenge ? ` Puis ${a} - ${result} = ${a-result}.` : ''); break;
    }
    case 'product-fraction': {
      const numerator = p.difficulty === 'soutien' ? 1 : b-1, n = a*numerator; rational = fraction(n,b); values = [n,b];
      statement = `Calcule ${a} × ${numerator}/${b} et simplifie.${challenge ? ' Écris aussi le résultat comme un entier et une fraction propre.' : ''}`;
      text = fractionText(n,b) + (challenge ? ` ; ${Math.floor(n/b)} + ${fractionText(n%b,b)}` : ''); explanation = `Multiplie le numérateur par ${a}, conserve le dénominateur ${b}, puis simplifie par un diviseur commun.`; break;
    }
    case 'decimal-fraction': {
      const den = 10**d.scale, unit = d.scale===1 ? 'dixièmes' : d.scale===2 ? 'centièmes' : 'millièmes'; rational = fraction(a,den); values = [a,den];
      statement = `Écris ${a} ${unit} sous forme de fraction décimale.${challenge ? ' Décompose ensuite en unités et fraction restante.' : ''}`;
      text = `${a}/${den}` + (challenge ? ` ; ${Math.floor(a/den)} + ${a%den}/${den}` : ''); explanation = `Un ${unit.slice(0,-1)} vaut 1/${den}.`; break;
    }
    case 'convert': statement = `Écris ${a}/${10**d.scale} sous forme décimale.${challenge ? ' Décompose aussi par valeurs de position.' : ''}`; values = [a]; text = decimalText(a,d.scale) + (challenge ? ` ; ${decompose(a,d.scale)}` : ''); explanation = `Place ${d.scale} chiffre(s) après la virgule, en ajoutant des zéros si nécessaire.`; break;
    case 'decimal': {
      const den=10**d.scale, rest=a%den, unit = d.scale===1 ? 'dixième' : d.scale===2 ? 'centième' : 'millième';
      statement = `Écris ${decimalText(a,d.scale)} en lettres, puis décompose-le par positions.`;
      text = `${numberWords(Math.floor(a/den))} unité${Math.floor(a/den)>1?'s':''} et ${numberWords(rest)} ${unit}${rest>1?'s':''} ; ${decompose(a,d.scale)}`; values=[a]; explanation = 'Chaque chiffre après la virgule représente des dixièmes, centièmes ou millièmes.'; break;
    }
    case 'add': values=[a+b+(challenge?c:0)]; statement=`Pose et calcule ${a} + ${b}${challenge ? ` + ${c}` : ''}.`; text=String(values[0]); explanation='Aligne les unités, dizaines et centaines. Additionne de droite à gauche et reporte les retenues.'; break;
    case 'subtract': values=[a-b-(challenge?c:0)]; statement=`Pose et calcule ${a} - ${b}${challenge ? `, puis enlève ${c} au résultat` : ''}.`; text=String(values[0]); explanation=`${a} - ${b} = ${a-b}.`+(challenge?` Puis ${a-b} - ${c} = ${values[0]}.`:' Aligne les positions et effectue les emprunts nécessaires.'); break;
    case 'multiply': values=[a*b]; statement=`Pose et calcule ${a} × ${b}.`; text=String(a*b); explanation=String(b).split('').reverse().map((digit,i)=>`${a} × ${Number(digit)*10**i} = ${a*Number(digit)*10**i}`).join(' ; ')+'. Additionne les produits partiels.'; break;
    case 'divide': {
      const q=Math.floor(a/b), rem=a%b; values=[q,rem]; statement=`Effectue la division euclidienne de ${a} par ${b}. Donne quotient et reste${challenge ? ', puis vérifie ton résultat' : ''}.`; text=`quotient ${q}, reste ${rem}`; explanation=`${a} = ${b} × ${q} + ${rem}, avec 0 ≤ ${rem} < ${b}.`; break;
    }
  }
  const equivalent = [text];
  if (rational) { equivalent.push(`${rational.numerator}/${rational.denominator}`); if(rational.denominator===1)equivalent.push(String(rational.numerator)); }
  return { id, type, data:d, statement, answer:{text,values,equivalent:[...new Set(equivalent)],...(rational?{fraction:rational}:{})}, explanation };
}
