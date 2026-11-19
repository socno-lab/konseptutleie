import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const digest=value=>createHash('sha256').update(value).digest('hex');
const output=new URL('../public/product-initial-state-first.js',import.meta.url),manifestUrl=new URL('./product-initial-state-manifest.json',import.meta.url);

async function bundle(){
 const {build}=await import('esbuild');
 const result=await build({absWorkingDir:root,entryPoints:['public/product-initial-state.js'],bundle:true,write:false,metafile:true,format:'iife',platform:'browser',target:'es2020',minify:true,legalComments:'none',charset:'utf8',plugins:[{name:'shared-module-versions',setup(builder){builder.onResolve({filter:/^\./},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0])}));}}]});
 const script='// Generated from product-initial-state.js and its shared renderers.\n// Regenerate with npm run generate:product-first; do not edit.\n'+result.outputFiles[0].text;
 const files=[...Object.keys(result.metafile.inputs),'server/product-initial-state-script.mjs','package.json','package-lock.json'].sort();
 const sources=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await readFile(path.resolve(root,file)))])));
 return {script,manifest:{sources,bundleSha256:digest(script)}};
}
export async function productInitialStateScript(){return (await bundle()).script;}
export async function writeProductInitialStateScript(){const {script,manifest}=await bundle();await writeFile(output,script);await writeFile(manifestUrl,JSON.stringify(manifest,null,2)+'\n');}
// Production builds can validate the committed artifact without installing
// development tooling. Any source/dependency change requires regeneration.
export async function assertProductInitialStateScript(){
 const manifest=JSON.parse(await readFile(manifestUrl,'utf8'));
 for(const [file,hash] of Object.entries(manifest.sources))assert.equal(digest(await readFile(path.resolve(root,file))),hash,'Product first-paint source changed: '+file+'; run npm run generate:product-first.');
 assert.equal(digest(await readFile(output)),manifest.bundleSha256,'Product first-paint artifact changed; regenerate from shared source.');
}
