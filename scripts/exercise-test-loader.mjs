import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
export function loadWithGlobals(overrides={},globals={}) {
  const cache=new Map();
  function load(filename) {
    const file=path.resolve(filename.endsWith('.ts')||filename.endsWith('.tsx')?filename:filename+(fs.existsSync(filename+'.ts')?'.ts':'.tsx'));
    if(cache.has(file))return cache.get(file);
    const exports={};cache.set(file,exports);
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    vm.runInNewContext(source,{exports,require(name){if(name in overrides)return overrides[name];if(name.startsWith('@/'))return load(name.slice(2));if(name.startsWith('.'))return load(path.join(path.dirname(file),name));return require(name);},crypto,TextEncoder,Uint8Array,Date,Intl,Response,Request,URL,console,process,...globals},{filename:file});
    return exports;
  }
  return load;
}
export const moduleLoader=overrides=>loadWithGlobals(overrides);
export function seeded(seed) { let state=seed;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}; }
