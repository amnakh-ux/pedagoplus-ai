import { getSkill, DIFFICULTIES } from './catalog';
import { ExerciseError } from './validation';
import type { Exercise, Sheet } from './types';
import { FoxitFixed, FoxitFixedBold } from './pdf-fonts';
import { ascii, pdfLayout, wrap } from './layout';
export { pdfLayout } from './layout';

// A small PDF 1.4 writer using embedded Courier-compatible CFF/WinAnsi fonts.
// No Node filesystem, browser, native binary or dynamic font fetch: Worker compatible.
const WIDTH=595.28, HEIGHT=841.89, MARGIN=42, LINE=24, CHAR=7.2;
function hex(text:string) { return [...ascii(text)].map(c=>{const n=c.charCodeAt(0);if(n>255)throw new ExerciseError('Caractère non pris en charge dans le PDF.');return n.toString(16).padStart(2,'0');}).join(''); }
function operation(e:Exercise) { return ['add','subtract','multiply','divide'].includes(e.type); }
export function createPdf(sheet:Sheet, correction=false): Uint8Array {
  if(correction&&!sheet.parameters.correction)throw new ExerciseError('Le corrigé exportable n’a pas été demandé.',403);
  const pages=pdfLayout(sheet,correction), streams:string[]=[];let index=0;
  for(let page=0;page<pages.length;page++){
    let commands='', y=HEIGHT-MARGIN;
    const text=(value:string,x=MARGIN,bold=false)=>{commands+=`q BT /${bold?'F2':'F1'} 12 Tf ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex(value)}> Tj ET Q\n`;};
    const line=(value:string,bold=false)=>{text(value,MARGIN,bold);y-=LINE;};
    const centered=(value:string)=>{for(const s of wrap(value,58)){text(s,(WIDTH-s.length*CHAR)/2,true);y-=LINE;}};
    const richLine=(value:string)=>{
      let x=MARGIN, offset=0;const regex=/(\d+)\/(\d+)/g;
      for(const match of value.matchAll(regex)){const prefix=value.slice(offset,match.index);text(prefix,x);x+=prefix.length*CHAR;const width=Math.max(match[1].length,match[2].length)*CHAR+6;
        const old=y;y+=6;text(match[1],x+(width-match[1].length*CHAR)/2);y-=18;text(match[2],x+(width-match[2].length*CHAR)/2);y=old;
        commands+=`${x} ${y+1} m ${x+width} ${y+1} l S\n`;x+=width;offset=match.index!+match[0].length;}
      text(value.slice(offset),x);y-=LINE;
    };
    const rich=(value:string)=>wrap(value).forEach(richLine);
    const draw=(e:Exercise,answer:boolean,spaces:boolean)=>{
      rich(e.statement);
      if(operation(e)){
        const operands=e.data.values.map(String), sign=e.type==='add'?'+':e.type==='subtract'?'-':e.type==='multiply'?'×':'÷';
        if(e.type==='divide'){
          text(operands[0],MARGIN+42);text(operands[1],MARGIN+180);
          commands+=`${MARGIN+164} ${y+14} m ${MARGIN+164} ${y-32} l S\n${MARGIN+164} ${y-8} m ${MARGIN+258} ${y-8} l S\n`;y-=66;
        }else{
          const width=Math.max(...operands.map(s=>s.length))+2,x=MARGIN+160;
          operands.forEach((v,i)=>{text((i?sign:' ').padEnd(2)+v.padStart(width-2),x);y-=18;});
          commands+=`${x} ${y+10} m ${x+width*CHAR} ${y+10} l S\n`;y-=30;
        }
      }else y-=12;
      if(answer){rich(e.answer.text);rich(e.explanation);}
      else if(spaces){for(let i=0;i<2;i++){commands+=`[1 3] 0 d ${MARGIN} ${y} m ${WIDTH-MARGIN} ${y} l S [] 0 d\n`;y-=LINE;}}
      y-=18;
    };
    centered((correction?'Corrigé - ':'')+sheet.title);
    if(page===0){
      line(`CM2 - Mathématiques - ${DIFFICULTIES[sheet.parameters.difficulty]}`);
      line(`${getSkill(sheet.parameters.skill)!.domain} - Durée : ${sheet.parameters.duration} minutes`);
      line(correction?'Réponses et explications.':'Nom : ................ Prénom : ................ Date : ..........');
      if(sheet.example){line('Exemple',true);draw(sheet.example,true,false);}
    }else y-=48;
    for(const e of pages[page]){index++;const labelled={...e,statement:`${index}. ${e.statement}`};draw(labelled,correction,sheet.parameters.spaces&&!correction);}
    if(y<MARGIN-1)throw new ExerciseError('Le contenu dépasse la page A4. Ajustez les options.');
    streams.push(commands);
  }
  const widths=Array.from({length:224},()=>600).join(' ');
  const objects:string[]=['<< /Type /Catalog /Pages 2 0 R >>','',
    `<< /Type /Font /Subtype /Type1 /BaseFont /ChromFixedOTF /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 /Widths [${widths}] /FontDescriptor 5 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /ChromFixedOTF-Bold /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 /Widths [${widths}] /FontDescriptor 7 0 R >>`,
    '<< /Type /FontDescriptor /FontName /ChromFixedOTF /Flags 33 /FontBBox [-100 -300 800 1000] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 600 /StemV 80 /FontFile3 6 0 R >>',
    `<< /Length ${FoxitFixed.length+1} /Filter /ASCIIHexDecode /Subtype /Type1C >>\nstream\n${FoxitFixed}>\nendstream`,
    '<< /Type /FontDescriptor /FontName /ChromFixedOTF-Bold /Flags 33 /FontBBox [-100 -300 800 1000] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 600 /StemV 100 /FontFile3 8 0 R >>',
    `<< /Length ${FoxitFixedBold.length+1} /Filter /ASCIIHexDecode /Subtype /Type1C >>\nstream\n${FoxitFixedBold}>\nendstream`];
  const pageIds:number[]=[];
  for(const stream of streams){const id=objects.length+1;pageIds.push(id);objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id+1} 0 R >>`);objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);}
  objects[1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let result='%PDF-1.4\n'; const offsets=[0];objects.forEach((object,i)=>{offsets.push(result.length);result+=`${i+1} 0 obj\n${object}\nendobj\n`;});
  const xref=result.length;result+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(result);
}
