import {renderMobileNavigation} from './mobile-navigation.mjs';
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
 html=renderMobileNavigation(html);
 // Bootstrap and shared customer-information scripts must use this release's module URLs.
 html=html.replace(/(<script\b[^>]*\bsrc=["'])(\/[^"'?]+\.js)(?:\?[^"']*)?(["'])/g,(_,start,file,end)=>start+file+'?v='+(file==='/app.js'?'buyout20261025b':file==='/shop.js'?'anchor20261024':file==='/customer-info.js'?'pricingchoices20261024':'launch20261024')+end);
 html=html.replace('</head>','<script type="module" src="/mobile-navigation.js?v=mobilemenu20261024c"></script><link rel="stylesheet" href="/cart-addons.css?v=pricinghint20261024"><link rel="stylesheet" href="/service-detail.css?v=pricinghint20261024"></head>');
 const version=await styleVersion(base);
 return version?html.replace(/(href=["']\/style\.css)(?:\?[^"']*)?(["'])/g,'$1?v='+version+'$2'):html;
}
