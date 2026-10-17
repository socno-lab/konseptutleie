import {planTrashPurge} from './server/trash-purge.mjs';
import {changeProductLifecycle} from './server/product-lifecycle.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {remaining} from './public/catalog-model.js';
import {createMysqlStore} from './server/store.mjs';
import {validateCatalog} from './server/catalog.mjs';
import {migrateProducts} from './server/walls.mjs';
import {digest,secretEqual,hashPassword,verifyPassword,sessionToken,issueSession,expiredCookie} from './server/auth.mjs';
import {staticImages,imageMime,mediaUsage} from './server/images.mjs';

const root=path.dirname(fileURLToPath(import.meta.url)),publicRoot=path.join(root,'public');
const seed=JSON.parse(await readFile(path.join(root,'data/catalog-export-2026-10-17.json'),'utf8'));
seed.products=migrateProducts(seed.products);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon'};
function publicCatalog(data){return {...data,products:data.products.filter(p=>p.active&&!p.deletedAt).map(p=>({...p,maxQuantity:remaining(p.id,{},data.products),includes:p.isPackage?(p.components||[]).map(c=>`${c.quantity} × ${data.products.find(x=>x.id===c.id)?.name||'Ukjent objekt'}`):undefined}))};}
const error=(message,status=400)=>Object.assign(Error(message),{status});
async function bytes(req,max){let length=0,large=false;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>max){large=true;chunks.length=0;}else if(!large)chunks.push(chunk);}if(large)throw error('Filen eller forespørselen er for stor.',413);return Buffer.concat(chunks);}
async function json(req,max=1500000){if(!req.headers['content-type']?.startsWith('application/json'))throw error('Forventet JSON.',415);try{return JSON.parse((await bytes(req,max)).toString('utf8'));}catch(e){if(e.status)throw e;throw error('Ugyldige data.');}}

export function createServer(options={}){
 const env=options.env||process.env,store=options.store||createMysqlStore(env,seed);
 const origin=options.origin||env.APP_ORIGIN||'https://blueviolet-ant-597153.hostingersite.com';
 const setupKey=options.setupKey??env.ADMIN_SETUP_KEY??'',secure=options.secureCookies??true,cookieName=secure?'__Host-konsept_session':'konsept_session';
 let images;
 const server=http.createServer(async(req,res)=>{
  const send=(status,body,type='text/plain; charset=utf-8',headers={})=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Cache-Control':'no-store',...headers});res.end(req.method==='HEAD'?undefined:body);};
  const out=(status,data,headers)=>send(status,JSON.stringify(data),'application/json; charset=utf-8',headers);
  const redirect=location=>send(302,'','text/plain',{Location:location});
  const authenticated=async()=>{const token=sessionToken(req,cookieName);return token.length===43&&!!(await store.session(digest(token)));};
  try{
   const url=new URL(req.url,'http://localhost');let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(400,'Ugyldig URL.');}
   const admin=pathname==='/admin'||pathname.startsWith('/admin/')||pathname==='/api/admin'||pathname.startsWith('/api/admin/');
   if(admin){
    if(!store.enabled)return out(503,{error:'Administrasjonen venter på databaseinnstillinger i Hostinger.'});
    if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)return out(403,{error:'Ugyldig opprinnelse. Last inn siden på nytt.'});
    if(pathname==='/api/admin/status'&&req.method==='GET'){const first=!(await store.admin());return out(200,{authenticated:await authenticated(),setupRequired:first,setupAvailable:first&&setupKey.length>=24});}
    if(pathname==='/api/admin/setup'&&req.method==='POST'){
     if(await store.admin())return out(409,{error:'Administrator er allerede opprettet. Logg inn.'});
     if(setupKey.length<24)return out(503,{error:'Engangsnøkkel må konfigureres i Hostinger før oppsett.'});
     if(!await store.attempt(digest('setup:'+req.socket.remoteAddress)))return out(429,{error:'For mange forsøk. Vent 15 minutter.'});
     const data=await json(req,5000);
     if(typeof data.key!=='string'||!secretEqual(data.key,setupKey))return out(403,{error:'Feil engangsnøkkel.'});
     if(typeof data.email!=='string'||data.email.length>254||!/^\S+@\S+\.\S+$/.test(data.email)||typeof data.password!=='string'||data.password.length<12||data.password.length>128)return out(400,{error:'Oppgi gyldig e-post og et passord på 12–128 tegn.'});
     const created=await store.createAdmin(data.email.trim().toLowerCase(),await hashPassword(data.password));
     if(!created)return out(409,{error:'Administrator er allerede opprettet.'});
     return out(200,{ok:true},{'Set-Cookie':await issueSession(store,cookieName,secure)});
    }
    if(pathname==='/api/admin/login'&&req.method==='POST'){
     if(!await store.attempt(digest('login:'+req.socket.remoteAddress)))return out(429,{error:'For mange forsøk. Vent 15 minutter.'});
     const data=await json(req,5000),user=await store.admin();
     if(typeof data.email!=='string'||typeof data.password!=='string'||data.password.length>128)return out(401,{error:'Feil e-post eller passord.'});
     const verified=user&&await verifyPassword(data.password,user.passwordHash);
     if(!verified||!secretEqual(data.email.trim().toLowerCase(),user.email))return out(401,{error:'Feil e-post eller passord.'});
     await store.resetAttempts(digest('login:'+req.socket.remoteAddress));
     return out(200,{ok:true},{'Set-Cookie':await issueSession(store,cookieName,secure)});
    }
    if(pathname==='/api/admin/logout'&&req.method==='POST'){
     const token=sessionToken(req,cookieName);if(token)await store.removeSession(digest(token));return out(200,{ok:true},{'Set-Cookie':expiredCookie(cookieName,secure)});
    }
    if(['/admin/login','/admin/login.html'].includes(pathname)&&['GET','HEAD'].includes(req.method))return send(200,await readFile(path.join(publicRoot,'admin/login.html')),'text/html; charset=utf-8');
    if(['/admin/login.js','/admin/admin.css'].includes(pathname)&&['GET','HEAD'].includes(req.method))return send(200,await readFile(path.join(publicRoot,pathname)),types[path.extname(pathname)]);
    if(!await authenticated())return pathname.startsWith('/api/')?out(401,{error:'Logg inn for å fortsette.'}):redirect('/admin/login');
    if(['/admin','/admin/','/admin/index.html'].includes(pathname)&&['GET','HEAD'].includes(req.method))return send(200,await readFile(path.join(publicRoot,'admin/index.html')),'text/html; charset=utf-8');
    if(pathname==='/api/admin/account'&&req.method==='GET'){const user=await store.admin();return out(200,{email:user.email});}
    if(pathname==='/api/admin/password'&&req.method==='PUT'){
     const data=await json(req,5000);if(typeof data.password!=='string'||data.password.length<12||data.password.length>128||data.password!==data.confirmation)return out(400,{error:'Passordene må være like og ha 12–128 tegn.'});
     const token=sessionToken(req,cookieName);const changed=await store.changePassword(digest(token),await hashPassword(data.password));if(!changed)return out(401,{error:'Innloggingen er utløpt. Logg inn på nytt.'});return out(200,{ok:true},{'Set-Cookie':await issueSession(store,cookieName,secure)});
    }
    if(pathname==='/api/admin/trash/purge'&&req.method==='POST'){
     const input=await json(req,400000),current=await store.readCatalog();if(input.revision!==current.revision)return out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});images??=staticImages(publicRoot);const trash=await store.mediaTrashState(),purged=await store.purgedMedia(),all=[...(await store.mediaList()),...(await images)].filter(m=>!purged.includes(m.url)).map(m=>({...m,deletedAt:trash[m.url]||''}));const plan=planTrashPurge(current,all,input),products=validateCatalog(plan.products),saved=await store.purgeTrash(current.revision,products,plan.mediaUrls);return saved?out(200,saved):out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});
    }
    const lifecycle=pathname.match(/^\/api\/admin\/products\/([a-z0-9_-]+)\/(trash|restore)$/);
    if(lifecycle&&req.method==='POST'){const data=await json(req,5000),current=await store.readCatalog();if(data.revision!==current.revision)return out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});const products=validateCatalog(changeProductLifecycle(current.products,lifecycle[1],lifecycle[2]));const saved=await store.saveCatalog(current.revision,products);return saved?out(200,saved):out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});}
    if(pathname==='/api/admin/catalog'){
     if(req.method==='GET')return out(200,await store.readCatalog());
     if(req.method==='PUT'){const data=await json(req);if(!Number.isInteger(data.revision)||data.revision<0)throw error('Ugyldig katalogversjon.');const products=validateCatalog(data.products);const result=await store.saveCatalog(data.revision,products);return result?out(200,result):out(409,{error:'Katalogen er endret av en annen administrator. Last inn på nytt før du lagrer.'});}
    }
    if(['/api/admin/media/trash','/api/admin/media/restore'].includes(pathname)&&req.method==='POST'){
     const input=await json(req,5000);if(typeof input.url!=='string'||input.url.length>500)return out(400,{error:'Ugyldig bildelenke.'});images??=staticImages(publicRoot);const purged=await store.purgedMedia(),all=[...(await store.mediaList()),...(await images)].filter(m=>!purged.includes(m.url)),image=all.find(m=>m.url===input.url);if(!image)return out(404,{error:'Bildet finnes ikke.'});
     if(pathname.endsWith('/trash')){const catalog=await store.readCatalog(),uses=mediaUsage(image,catalog.products);if(uses.length)return out(409,{error:'Bildet brukes av '+uses.map(p=>p.name+(p.deletedAt?' (i papirkurven)':'')).join(', ')+'. Fjern bildet fra produktene først.'});await store.trashMedia(image.url);}else await store.restoreMedia(image.url);return out(200,{ok:true});
    }
    if(pathname==='/api/admin/media'){
     if(req.method==='GET'){images??=staticImages(publicRoot);const data=await store.readCatalog();const all=[...(await store.mediaList()),...(await images)],trash=await store.mediaTrashState(),purged=await store.purgedMedia();return out(200,{images:all.filter(m=>!purged.includes(m.url)).map(image=>({...image,deletedAt:trash[image.url]||'',usedBy:mediaUsage(image,data.products)}))});}
     if(req.method==='POST'){
      const body=await bytes(req,8*1024*1024),mime=imageMime(body);if(!mime)throw error('Velg JPG, PNG, WebP eller AVIF. SVG og andre filtyper støttes ikke.',415);
      let name;try{name=decodeURIComponent(req.headers['x-filename']||'bilde');}catch{name='bilde';}name=name.replace(/[\x00-\x1f/\\]/g,'').slice(0,180)||'bilde';
      const saved=await store.addMedia(name,mime,body);await store.restoreMedia(saved.url);return out(201,saved);
     }
    }
    if(pathname.startsWith('/api/admin/'))return out(405,{error:'Metoden eller adressen støttes ikke.'});
   }
   if(!['GET','HEAD'].includes(req.method))return send(405,'Metoden støttes ikke.');
   if(pathname==='/api/catalog'){const data=store.enabled?await store.readCatalog():seed;return out(200,{...publicCatalog(data),canAdmin:store.enabled&&await authenticated()});}
   if(store.enabled&&(pathname.startsWith('/assets/')||pathname.startsWith('/media/'))&&(await store.purgedMedia()).some(url=>decodeURIComponent(url)===pathname))return send(404,'Fant ikke bildet.');
   const media=pathname.match(/^\/media\/([a-f0-9]{32})$/);if(media){if(!store.enabled)return send(404,'Fant ikke bildet.');const image=await store.media(media[1]);return image?send(200,image.body,image.mime,{'Cache-Control':'public, max-age=31536000, immutable'}):send(404,'Fant ikke bildet.');}
   if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.')))return send(404,'Fant ikke siden.');
   const target=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(publicRoot+path.sep))return send(404,'Fant ikke siden.');
   const type=types[path.extname(target).toLowerCase()];if(!type)return send(404,'Fant ikke siden.');
   return send(200,await readFile(target),type);
  }catch(e){
   if(e.code==='ENOENT'||e.code==='EISDIR')return send(404,'Fant ikke siden.');
   if(e.status)return out(e.status,{error:e.message});
   if(e.message&&/^Ugyldig|^Katalogen|^Et bildevegg|^Rammene|^Bildeveggoppsett|^Objekt|^En modul|^Oppgi|^Pakker|^Anbefalinger|^Tilvalg|^Priser|^Prisen|^En pakke|^Utilgjengelig|^Bildelenken|^Bruk en/.test(e.message))return out(400,{error:e.message});
   console.error('Admin/katalog: '+(e.code||e.name||'serverfeil'));return out(503,{error:'Kunne ikke kontakte lagringen. Kontroller databaseinnstillinger eller prøv igjen.'});
  }
 });
 server.requestTimeout=30000;server.headersTimeout=15000;
 return server;
}
