import {mkdir,rename,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const publicHtmlNames=['index.html','utvalg.html','anledning.html','kjop.html','leieprodukt.html','kjopsprodukt.html','kundeinfo.html'];
export async function prepareHtmlTemplates(base=root){
 // Hostinger serves existing public/*.html before Node. Keep dynamic templates outside that static root.
 const templates=path.join(base,'server','templates');await mkdir(templates,{recursive:true});
 for(const name of publicHtmlNames){try{await rename(path.join(base,'public',name),path.join(templates,name));}catch(error){if(error.code!=='ENOENT')throw error;await readFile(path.join(templates,name));}}
}
const styleVersions=new Map();
async function styleVersion(base){
 if(!styleVersions.has(base))styleVersions.set(base,readFile(path.join(base,'public','style.css')).then(css=>createHash('sha256').update(css).digest('hex').slice(0,12)).catch(error=>{styleVersions.delete(base);if(error.code!=='ENOENT')throw error;return ''; }));
 return styleVersions.get(base);
}
export async function readHtmlTemplate(name,base=root){
 if(!publicHtmlNames.includes(name))throw Error('Ukjent HTML-mal.');
 let html;try{html=await readFile(path.join(base,'server','templates',name),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;html=await readFile(path.join(base,'public',name),'utf8');}
 // A count is unknown until the saved basket has been read and validated.
 html=html.replace(/(<span id="(?:count|saleCount)">)0(<\/span>)/g,'$1…$2');
 // A new stylesheet must bypass the previous release's one-hour browser cache.
 html=html.replace(/(src=["']\/(?:app|shop)\.js)(?:\?[^"']*)?(["'])/g,'$1?v=christmas20261023e$2');
 const version=await styleVersion(base);
 return version?html.replace(/(href=["']\/style\.css)(?:\?[^"']*)?(["'])/g,'$1?v='+version+'$2'):html;
}
