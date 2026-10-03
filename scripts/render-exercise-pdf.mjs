import fs from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
const file=process.argv[2];
if(!/^tmp\/pdfs\/[a-z0-9-]+\.pdf$/.test(file))throw new Error('Only exercise QA PDFs can be rendered.');
// A fresh process prevents pdf-parse's shared font/canvas cache from affecting
// subsequent documents in a batch. Render before text extraction.
const parser=new PDFParse({data:await fs.readFile(file),useSystemFonts:false,disableFontFace:true});
try{
  const result=await parser.getScreenshot({desiredWidth:900});
  for(const [i,page] of result.pages.entries())await fs.writeFile(file.replace(/\.pdf$/,`-${i+1}.png`),page.data);
}finally{await parser.destroy();}
