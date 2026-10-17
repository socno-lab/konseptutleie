import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {remaining} from './public/catalog-model.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.join(root,'public');
const source=JSON.parse(await readFile(path.join(root,'data/catalog-export-2026-10-17.json'),'utf8'));
const products=source.products;
const catalog={revision:source.revision,canAdmin:false,products:products.filter(p=>p.active).map(p=>({...p,maxQuantity:remaining(p.id,{},products),includes:p.isPackage?(p.components||[]).map(c=>`${c.quantity} × ${products.find(x=>x.id===c.id)?.name||'Ukjent objekt'}`):undefined}))};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon'};

export function createServer(){return http.createServer(async(req,res)=>{
 const send=(status,body,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);};
 try{
  const url=new URL(req.url,'http://localhost');
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(400,'Ugyldig URL.');}
  if(pathname==='/admin'||pathname.startsWith('/admin/')||pathname==='/api/admin'||pathname.startsWith('/api/admin/'))return send(503,'Administrasjon er ikke aktivert i denne eksporten. Database og innlogging må konfigureres før lansering.');
  if(!['GET','HEAD'].includes(req.method))return send(405,'Metoden støttes ikke.');
  if(pathname==='/api/catalog')return send(200,JSON.stringify(catalog),'application/json; charset=utf-8');
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.')))return send(404,'Fant ikke siden.');
  const target=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(publicRoot+path.sep))return send(404,'Fant ikke siden.');
  const type=types[path.extname(target).toLowerCase()];
  if(!type)return send(404,'Fant ikke siden.');
  const body=await readFile(target);
  return send(200,body,type);
 }catch(e){return send(e.code==='ENOENT'||e.code==='EISDIR'?404:500,'Fant ikke siden.');}
});}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const port=Number(process.env.PORT||3000);
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Ugyldig PORT.');
 createServer().listen(port,'0.0.0.0',()=>console.log(`Konsept Utleie lytter på port ${port}`));
}
