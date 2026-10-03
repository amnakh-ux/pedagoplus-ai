import { ExerciseError } from './validation';
import type { Exercise, Sheet } from './types';
const HEIGHT=841.89,MARGIN=42,LINE=24,COLS=70;
export function ascii(text:string) { return text.replaceAll('’',"'").replaceAll('…','...').replaceAll('≤','<=').replaceAll('≥','>=').replaceAll('—','-').replaceAll('–','-').replaceAll('\u202f',' ').replaceAll('\u00a0',' '); }
export function wrap(text:string,columns=COLS): string[] {
  const lines:string[]=[];
  for(const paragraph of ascii(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(word.length>columns)throw new ExerciseError('Un mot est trop long pour la mise en page.');if(line.length+word.length+1>columns){lines.push(line);line='';}line+=(line?' ':'')+word;}lines.push(line);}
  return lines;
}
function blockHeight(e:Exercise,answer:boolean,spaces:boolean){return wrap(e.statement).length*LINE+(['add','subtract','multiply','divide'].includes(e.type)?(e.data.values.length+1)*18+12:12)+(answer?(wrap(e.answer.text).length+wrap(e.explanation).length)*LINE:spaces?48:0)+18;}
export function pdfLayout(sheet:Sheet,correction=false){
  const p=sheet.parameters,header=wrap(sheet.title,58).length*LINE+96,exampleHeight=sheet.example?blockHeight(sheet.example,true,false)+LINE:0;
  const pages:Exercise[][]=[[]];let used=MARGIN+header+exampleHeight;
  for(const [i,e] of sheet.exercises.entries()){
    const h=blockHeight({...e,statement:`${i+1}. ${e.statement}`},correction,p.spaces&&!correction);
    if(used+h>HEIGHT-MARGIN){pages.push([]);used=MARGIN+72;}
    if(used+h>HEIGHT-MARGIN)throw new ExerciseError('Un exercice dépasse une page A4.');
    pages[pages.length-1].push(e);used+=h;
  }
  if(!correction&&pages.length>p.pages)throw new ExerciseError(`Le contenu nécessite ${pages.length} pages élève à 12 points. Choisissez deux pages, moins d’exercices ou retirez l’exemple/les espaces de réponse.`);
  if(!correction&&p.pages===2&&pages.length===1){const middle=Math.ceil(sheet.exercises.length/2);pages.splice(0,1,sheet.exercises.slice(0,middle),sheet.exercises.slice(middle));}
  return pages;
}
