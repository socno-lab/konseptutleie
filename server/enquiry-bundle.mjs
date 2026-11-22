import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readHtmlTemplate} from './html-templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const output='public/rental-enquiry.bundle.js';
const manifest='server/enquiry-bundle-manifest.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const moduleTag=/<script type="module" src="(\/[\w./?-]+(?:=[\w.-]+)?)"><\/script>/g;

async function entrySources(){
 const html=await readHtmlTemplate('utvalg.html');
 return [...html.matchAll(moduleTag)].map(match=>match[1]);
}
async function fingerprints(files){
 return Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await readFile(path.join(root,file)))])));
}
export async function generateEnquiryBundle(){
 const {build}=await import('esbuild');
 const entries=await entrySources();
 const result=await build({absWorkingDir:root,stdin:{contents:entries.map(url=>'import '+JSON.stringify('.'+url)+';').join('\n'),resolveDir:path.join(root,'public')},
  bundle:true,minify:true,format:'esm',target:'es2022',metafile:true,write:false});
 const files=Object.keys(result.metafile.inputs).filter(name=>name!=='<stdin>').map(name=>name.split('?')[0]);
 const sources=await fingerprints([...new Set(files)].sort());
 const bytes=result.outputFiles[0].contents;
 await writeFile(path.join(root,output),bytes);
 await writeFile(path.join(root,manifest),JSON.stringify({entries,sources,digest:hash(bytes)},null,2)+'\n');
}
export async function verifyEnquiryBundle(){
 const saved=JSON.parse(await readFile(path.join(root,manifest),'utf8'));
 if(JSON.stringify(await entrySources())!==JSON.stringify(saved.entries)||
    JSON.stringify(await fingerprints(Object.keys(saved.sources)))!==JSON.stringify(saved.sources)||
    hash(await readFile(path.join(root,output)))!==saved.digest)
  throw Error('Regenerate the rental checkout with node scripts/build-enquiry-bundle.mjs');
}
export function bundleEnquiryHtml(html,saved){
 const entries=[...html.matchAll(moduleTag)].map(match=>match[1]);
 if(!entries.length||JSON.stringify(entries)!==JSON.stringify(saved.entries))return html;
 const src='/rental-enquiry.bundle.js?v='+saved.digest.slice(0,12);
 let inserted=false;
 return html.replace(moduleTag,()=>{
  if(inserted)return '';
  inserted=true;
  return '<script type="module" src="'+src+'"></script>';
 });
}
