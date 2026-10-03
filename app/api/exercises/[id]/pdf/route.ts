import { getCurrentTeacher } from '@/lib/current-teacher';
import { errorResponse, getOwnedSheet } from '@/lib/exercises/service';
import { createPdf } from '@/lib/exercises/pdf';
import { ExerciseError } from '@/lib/exercises/validation';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});
    const record=await getOwnedSheet(teacher.id,(await params).id);
    if(!record.savedAt)throw new ExerciseError('Enregistrez la fiche avant de télécharger le PDF.',409);
    const search=new URL(request.url).searchParams,revision=Number(search.get('revision'));
    if(search.has('revision')&&revision!==record.revision)throw new ExerciseError('La version enregistrée a changé. Rechargez la fiche.',409);
    const correction=search.get('kind')==='correction';
    const bytes=createPdf(record.snapshot,correction);
    return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="fiche-${record.id}-${correction?'corrige':'eleve'}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }catch(error){return errorResponse(error);}
}
