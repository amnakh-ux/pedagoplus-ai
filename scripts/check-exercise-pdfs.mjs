import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { PDFParse } from 'pdf-parse';
import { moduleLoader, seeded } from './exercise-test-loader.mjs';
const load=moduleLoader(),engine=load('lib/exercises/generators'),pdf=load('lib/exercises/pdf');
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[require.resolve('pdf-parse')]}));
await fs.mkdir('tmp/pdfs',{recursive:true});
for(const skill of ['grands-nombres','fractions-simples','fraction-vers-decimal','multiplication','division'])for(const pages of [1,2]){
  const p={level:'CM2',subject:'Mathématiques',skill,difficulty:'standard',count:pages===1?3:6,duration:20,example:false,correction:true,spaces:pages===2,pages};
  const sheet=engine.generateSheet(p,seeded(1729));
  for(const correction of [false,true]){
    const name=`${skill}-${pages}p-${correction?'corrige':'eleve'}`,bytes=pdf.createPdf(sheet,correction);
    await fs.writeFile(`tmp/pdfs/${name}.pdf`,bytes);
    const parser=new PDFParse({data:bytes,standardFontDataUrl:path.resolve('node_modules/pdfjs-dist/standard_fonts').replaceAll('\\','/')+'/',useSystemFonts:false,disableFontFace:true});
    try{
      const info=await parser.getInfo({parsePageInfo:true}),text=await parser.getText();
      if(!correction)assert.equal(info.total,pages);
      assert.ok(text.text.includes('CM2'));assert.ok(!text.text.includes('Télécharger'));
      if(correction)assert.ok(text.text.includes('Corrigé'));else assert.ok(!text.text.includes('Réponses et explications'));
      const rendered=spawnSync(process.execPath,['scripts/render-exercise-pdf.mjs',`tmp/pdfs/${name}.pdf`],{encoding:'utf8'});
      assert.equal(rendered.status,0,rendered.stderr);
      console.log(`PASS PDF ${name}: ${info.total} page(s), parsed and rendered`);
    }finally{await parser.destroy();}
  }
}
for(const skill of ['grands-nombres','fractions-simples','fraction-vers-decimal','multiplication','division']){
  const files=(await fs.readdir('tmp/pdfs')).filter(name=>name.startsWith(skill+'-')&&name.endsWith('.png')&&!name.includes('contact'));
  const canvas=createCanvas(1800,Math.ceil(files.length/3)*850),context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);
  for(const [i,file] of files.entries()){const image=await loadImage(await fs.readFile('tmp/pdfs/'+file));context.drawImage(image,(i%3)*600,Math.floor(i/3)*850,600,850);}
  await fs.writeFile(`tmp/pdfs/${skill}-contact.png`,canvas.toBuffer('image/png'));
}
