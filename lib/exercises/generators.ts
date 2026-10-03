import { getSkill } from './catalog';
import { correct } from './corrections';
import { data, ExerciseError, parameters } from './validation';
import type { Exercise, ExerciseData, Parameters, Sheet } from './types';
export const GENERATOR_VERSION = '1.0.0';
export type Random = () => number;
export const random: Random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
export function generateExercise(p: Parameters, id: string, excluded: Exercise[] = [], rng: Random = random): Exercise {
  const skill=getSkill(p.skill)!, r=skill.rules[p.difficulty], type=skill.types[0];
  const int=(min:number,max:number)=>min+Math.floor(rng()*(max-min+1));
  for(let attempt=0;attempt<1000;attempt++) {
    let values=[int(r.min,r.max)], scale=0;
    if(type==='order')values=[int(1,r.max),int(1,r.max),int(1,r.max)];
    if(type==='fraction'){const den=r.denominators[int(0,r.denominators.length-1)];values=[int(1,den-1),den];}
    if(type==='quantity'||type==='product-fraction'){const den=r.denominators[int(0,r.denominators.length-1)];values=[type==='quantity'?den*int(1,Math.floor(r.max/den)):int(1,r.max),den];}
    if(['decimal-fraction','convert','decimal'].includes(type))scale=r.decimals;
    if(type==='add'||type==='subtract') {
      if(!r.carries){
        const digits=Array.from({length:3},()=>{const a=int(1,8),b=int(0,type==='add'?9-a:a);return [a,b];});
        values=[Number(digits.map(x=>x[0]).join('')),Number(digits.map(x=>x[1]).join(''))];
      }else {values=[int(Math.ceil(r.max/2),r.max),int(1,Math.floor(r.max/4))];if(r.steps===2)values.push(int(1,Math.floor(r.max/4)));}
    }
    if(type==='multiply')values=[int(1,r.carries?r.max:9),int(r.carries?10:2,r.factorMax)];
    if(type==='divide'){const den=int(r.carries?10:2,r.factorMax),q=int(1,Math.floor((r.max-den+1)/den));values=[den*q+(r.carries?int(0,den-1):0),den];}
    try {const exercise=correct(id,p,{values,scale});if(!excluded.some(e=>e.statement===exercise.statement))return exercise;}catch(error){if(!(error instanceof ExerciseError))throw error;}
  }
  // Soutien fractions have only four distinct proper fractions; do not promise six unique items.
  if(type==='fraction'&&excluded.length>=4)return correct(id,p,{values:[1,2],scale:0});
  throw new ExerciseError('Impossible de produire un exercice distinct. Ajustez les paramètres.');
}
export function generateSheet(input: unknown,rng:Random=random): Sheet {
  const p=parameters(input), exercises:Exercise[]=[];
  for(let i=0;i<p.count;i++)exercises.push(generateExercise(p,crypto.randomUUID(),exercises,rng));
  return {formatVersion:1,generatorVersion:GENERATOR_VERSION,title:getSkill(p.skill)!.title,parameters:p,exercises,example:p.example?generateExercise(p,crypto.randomUUID(),exercises,rng):null};
}
export function editSheet(stored:Sheet, edits: unknown): Sheet {
  if(!Array.isArray(edits)||edits.length!==stored.exercises.length)throw new ExerciseError('Nombre d’exercices invalide.');
  const exercises=edits.map((input,i)=>{
    const old=stored.exercises[i],candidate=data(input as ExerciseData);
    return JSON.stringify(candidate)===JSON.stringify(old.data)?old:correct(old.id,stored.parameters,candidate);
  });
  if(new Set(exercises.map(e=>e.statement)).size!==exercises.length && !(stored.parameters.skill==='fractions-simples'&&stored.parameters.difficulty==='soutien'))throw new ExerciseError('Deux exercices sont identiques. Modifiez leurs données.');
  return {...stored,generatorVersion:exercises.some((e,i)=>e!==stored.exercises[i])?GENERATOR_VERSION:stored.generatorVersion,exercises};
}
export function readSheet(input: unknown): Sheet {
  if(!input||typeof input!=='object')throw new ExerciseError('Fiche enregistrée invalide.');
  const s=input as Sheet;
  if(s.formatVersion!==1||typeof s.generatorVersion!=='string'||!Array.isArray(s.exercises))throw new ExerciseError('Version de fiche non prise en charge.');
  parameters(s.parameters);
  if(s.exercises.length!==s.parameters.count||s.exercises.some(e=>!e.id||!e.answer||typeof e.statement!=='string'))throw new ExerciseError('Fiche incomplète.');
  // Read the stored photograph, never regenerate an older sheet on load.
  return s;
}
