import { ExerciseError } from './validation';
export async function readJson(request:Request) {
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ExerciseError('Origine de demande non autorisée.',403);
  if(Number(request.headers.get('content-length')??0)>65536)throw new ExerciseError('Demande trop volumineuse.',413);
  const body=await request.text();if(body.length>65536)throw new ExerciseError('Demande trop volumineuse.',413);
  try{const value=JSON.parse(body);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new ExerciseError('Données JSON invalides.');}
}
