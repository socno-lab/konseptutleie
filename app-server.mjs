import {enquiryPageHtml} from './server/enquiry-page.mjs';
import {addonBuyoutPrice} from './public/buyout-model.js';
import {createCatalogThumbnailer} from './server/catalog-thumbnails.mjs';
import {createPublicCatalogCache} from './server/public-catalog-cache.mjs';
import {withPackageAddons} from './public/package-addon-model.js';
import {readHtmlTemplate} from './server/html-templates.mjs';
import {indexableEnvironment,pageModel,renderSeo,sitemap,robots} from './server/seo.mjs';
import {createSubmissionSender} from './server/submissions.mjs';
import {createRequestGuard,contentPolicy} from './server/request-guard.mjs';
import {defaultSettings,configureSiteSettings,validateSiteSettings,validateSettingsUsage,sortProducts} from './public/site-settings.js';
import {createDeliveryEstimator,deliveryRates,warehouse} from './server/delivery.mjs';
import {salesEnabled,saleUnitPrice} from './public/sales-model.js';
import {discountQuote,validateDiscountCodes} from './server/discounts.mjs';
import {rentalRateSets} from './public/rental-pricing-model.js';
import {resolvedPackagePurchasePrice} from './public/business-purchase-model.js';
import {planTrashPurge} from './server/trash-purge.mjs';
import {changeProductLifecycle} from './server/product-lifecycle.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {remaining} from './public/catalog-model.js';
import {createMysqlStore} from './server/store.mjs';
import {validateCatalog,removeRetiredCosts} from './server/catalog.mjs';
import {migrateProducts} from './server/walls.mjs';
import {digest,secretEqual,hashPassword,verifyPassword,sessionToken,issueSession,expiredCookie} from './server/auth.mjs';
import {staticImages,imageMime,mediaUsage} from './server/images.mjs';

const root=path.dirname(fileURLToPath(import.meta.url)),publicRoot=path.join(root,'public');
const seed=JSON.parse(await readFile(path.join(root,'data/catalog-export-2026-10-17.json'),'utf8'));
seed.products=migrateProducts(removeRetiredCosts(seed.products));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.woff2':'font/woff2'};
export function publicCatalog(data){configureSiteSettings(data.settings);data={...data,products:withPackageAddons(data.products)};return {...data,products:sortProducts(data.products.filter(p=>p.active&&!p.deletedAt)).map(p=>{const {purchaseUnitPrice,acquisitionCost,...visible}=p;const rentalRates=rentalRateSets(p,data.products);return {...visible,buyoutUnitPrice:addonBuyoutPrice(p),rentalEnabled:p.rentalEnabled!==false,saleEnabled:salesEnabled(p),salePrice:saleUnitPrice(p),...rentalRates.standard,rentalRates,purchasePrice:resolvedPackagePurchasePrice(p,data.products),maxQuantity:remaining(p.id,{},data.products),includes:p.isPackage?(p.components||[]).map(c=>`${c.quantity} × ${data.products.find(x=>x.id===c.id)?.name||'Ukjent objekt'}`):undefined};})};}
const error=(message,status=400)=>Object.assign(Error(message),{status});
async function bytes(req,max){if(Number(req.headers['content-length'])>max)throw error('Filen eller forespørselen er for stor.',413);let length=0,large=false;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>max){large=true;chunks.length=0;}else if(!large)chunks.push(chunk);}if(large)throw error('Filen eller forespørselen er for stor.',413);return Buffer.concat(chunks);}
async function json(req,max=1500000){if(!req.headers['content-type']?.startsWith('application/json'))throw error('Forventet JSON.',415);try{const value=JSON.parse((await bytes(req,max)).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw error('Forventet et JSON-objekt.');return value;}catch(e){if(e.status)throw e;throw error('Ugyldige data.');}}

export function createServer(options={}){
 const env=options.env||process.env,store=options.store||createMysqlStore(env,seed);
 const origin=options.origin||env.APP_ORIGIN||'https://blueviolet-ant-597153.hostingersite.com';
 const setupKey=options.setupKey??env.ADMIN_SETUP_KEY??'',secure=options.secureCookies??true,cookieName=secure?'__Host-konsept_session':'konsept_session';
 const submissions=createSubmissionSender(env,store,options.sendMail);
 const delivery=createDeliveryEstimator(env,options.deliveryFetch,{reserve:store.enabled?now=>store.reserveDeliveryCall(now):undefined});
 async function readCatalog(){const data=await store.readCatalog(),site=store.readSiteSettings?await store.readSiteSettings():{settings:defaultSettings};configureSiteSettings(site.settings);return {...data,settings:site.settings};}
 const publicCache=createPublicCatalogCache(async()=>store.enabled?readCatalog():{...seed,settings:defaultSettings},publicCatalog,options.publicCatalogCache);
 async function readPublicCatalog(){const data=await publicCache.get();configureSiteSettings(data.settings);return data;}
 const thumbnails=createCatalogThumbnailer(options.thumbnailOptions);let mediaActive=0;
 const invalidatePublic=()=>publicCache.invalidate();
 let images;const enterRequest=createRequestGuard(options.requestGuard),enterAuth=createRequestGuard({maxActive:2,maxClientActive:2});
 const server=http.createServer(async(req,res)=>{
  const send=(status,body,type='text/plain; charset=utf-8',headers={})=>{res.writeHead(status,{'Content-Type':type,'Content-Security-Policy':contentPolicy+"; frame-ancestors 'none'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store',...headers});res.end(req.method==='HEAD'?undefined:body);};
  const out=(status,data,headers)=>send(status,JSON.stringify(data),'application/json; charset=utf-8',headers);
  const redirect=location=>send(302,'','text/plain',{Location:location});
  const authenticated=async()=>{const token=sessionToken(req,cookieName);return token.length===43&&!!(await store.session(digest(token)));};
  let pathname='';
  const missing=async()=>send(404,await readFile(path.join(publicRoot,'404.html')),'text/html; charset=utf-8',{'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'});
  try{
   // Keep the custom domain unpublished during the temporary-domain preview.
   const hosts=[req.headers.host,req.headers['x-forwarded-host']].flatMap(value=>String(value||'').split(',')).map(value=>value.trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,''));
   if(hosts.some(host=>['konseptboligstyling.com','www.konseptboligstyling.com'].includes(host)))return send(404,'<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ikke publisert</title></head><body><main><h1>Nettsiden er ikke publisert.</h1></main></body></html>','text/html; charset=utf-8');
   const url=new URL(req.url,'http://localhost');try{pathname=decodeURIComponent(url.pathname);}catch{return send(400,'Ugyldig URL.');}
   if(['GET','HEAD'].includes(req.method)&&new URL(origin).hostname==='konseptuell.no'&&hosts.includes('www.konseptuell.no'))return send(308,'','text/plain',{Location:'https://konseptuell.no'+url.pathname+url.search});
   const indexing=store.enabled&&indexableEnvironment(origin,env,hosts);
   if(pathname==='/anledning.html'&&(url.searchParams.get('anledning')==='boligfoto'||url.searchParams.get('bruk')==='boligsalg')&&['GET','HEAD'].includes(req.method))return send(308,'','text/plain',{Location:'/utvalg.html?bruk=boligsalg'});
   if(pathname==='/index.html'&&['GET','HEAD'].includes(req.method))return send(308,'','text/plain',{Location:'/'+url.search});
   if(['GET','HEAD'].includes(req.method)&&hosts.includes('konseptuell.no')&&req.headers['x-forwarded-proto']==='http')return send(308,'','text/plain',{Location:'https://konseptuell.no'+url.pathname+url.search});
   if(pathname==='/robots.txt'&&['GET','HEAD'].includes(req.method))return send(200,robots(indexing));
   if(pathname.startsWith('/api/')){
    const release=enterRequest(digest(String(req.socket.remoteAddress||'shared')));
    if(!release)return out(429,{error:'For mange forespørsler. Vent litt og prøv igjen.'},{'Retry-After':'60'});
    res.once('finish',release);res.once('close',release);
    if(['/api/admin/login','/api/admin/setup','/api/admin/password'].includes(pathname)&&!['GET','HEAD'].includes(req.method)){
     const releaseAuth=enterAuth('auth');if(!releaseAuth)return out(429,{error:'Innlogging er opptatt. Vent litt og prøv igjen.'},{'Retry-After':'5'});
     res.once('finish',releaseAuth);res.once('close',releaseAuth);
    }
   }
   if(pathname==='/api/submissions'){
    if(req.method==='GET')return out(200,{enabled:submissions.enabled});
    if(req.method!=='POST')return out(405,{error:'Metoden støttes ikke.'});
    if(req.headers.origin!==origin)return out(403,{error:'Last inn siden på nytt før du sender.'});
    const input=await json(req,90000),catalog=store.enabled?await readCatalog():seed;
    return out(200,await submissions.submit(input,catalog.products,digest(String(req.socket.remoteAddress||'shared')),{verifyDelivery:(...args)=>delivery.verifyQuote(...args,catalog.products)}));
   }
   if(pathname==='/api/delivery-estimate'){
    if(req.method==='GET'){if(store.enabled)await readCatalog();return out(200,{enabled:delivery.enabled,rates:deliveryRates,warehouse});}
    if(req.method!=='POST')return out(405,{error:'Metoden støttes ikke.'});
    if(req.headers.origin!==origin)return out(403,{error:'Last inn siden på nytt før du beregner frakt.'});
    const input=await json(req,20000),catalog=store.enabled?await readCatalog():seed;return out(200,await delivery.estimate(input,digest(String(req.socket.remoteAddress||'shared')),catalog.products));
   }
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
    if(pathname==='/api/admin/enquiry-mail'&&req.method==='GET')return out(200,{messages:await store.enquiryMailStatus()});
    if(pathname==='/api/admin/enquiry-mail/retry'&&req.method==='POST'){
     const data=await json(req,1000);if(!/^[a-f0-9-]{36}$/.test(data.reference||'')||!['internal','customer'].includes(data.channel))throw error('Ugyldig sendereferanse.');
     const queued=await store.retryEnquiryMail(data.reference,data.channel,data.acknowledgeUncertain===true);if(!queued)return out(409,{error:'E-posten er allerede sendt, venter i kø eller behandles. Last inn status på nytt.'});void submissions.flush();return out(200,{ok:true});
    }
    if(pathname==='/api/admin/account'&&req.method==='GET'){const user=await store.admin();return out(200,{email:user.email});}
    if(pathname==='/api/admin/password'&&req.method==='PUT'){
     const data=await json(req,5000);if(typeof data.password!=='string'||data.password.length<12||data.password.length>128||data.password!==data.confirmation)return out(400,{error:'Passordene må være like og ha 12–128 tegn.'});
     const token=sessionToken(req,cookieName);const changed=await store.changePassword(digest(token),await hashPassword(data.password));if(!changed)return out(401,{error:'Innloggingen er utløpt. Logg inn på nytt.'});return out(200,{ok:true},{'Set-Cookie':await issueSession(store,cookieName,secure)});
    }
    if(pathname==='/api/admin/trash/purge'&&req.method==='POST'){
     const input=await json(req,400000),current=await readCatalog();if(input.revision!==current.revision)return out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});images??=staticImages(publicRoot);const trash=await store.mediaTrashState(),purged=await store.purgedMedia(),all=[...(await store.mediaList()),...(await images)].filter(m=>!purged.includes(m.url)).map(m=>({...m,deletedAt:trash[m.url]||''}));const plan=planTrashPurge(current,all,input),products=validateCatalog(plan.products),saved=await store.purgeTrash(current.revision,products,plan.mediaUrls);if(saved){invalidatePublic();thumbnails.clear();}return saved?out(200,saved):out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});
    }
    const lifecycle=pathname.match(/^\/api\/admin\/products\/([a-z0-9_-]+)\/(trash|restore)$/);
    if(lifecycle&&req.method==='POST'){const data=await json(req,5000),current=await readCatalog();if(data.revision!==current.revision)return out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});const products=validateCatalog(changeProductLifecycle(current.products,lifecycle[1],lifecycle[2]));const saved=await store.saveCatalog(current.revision,products);if(saved)invalidatePublic();return saved?out(200,saved):out(409,{error:'Katalogen er endret. Last inn på nytt før du fortsetter.'});}
    if(pathname==='/api/admin/discounts'){
     if(req.method==='GET')return out(200,await store.readDiscountCodes());
     if(req.method==='PUT'){const data=await json(req,100000);if(!Number.isInteger(data.revision))throw error('Ugyldig versjon.');const codes=validateDiscountCodes(data.codes),saved=await store.saveDiscountCodes(data.revision,codes);return saved?out(200,saved):out(409,{error:'Rabattkodene er endret. Last inn siden på nytt.'});}
    }
    if(pathname==='/api/admin/site-settings'){
     if(req.method==='GET')return out(200,await store.readSiteSettings());
     if(req.method==='PUT'){const input=await json(req,1000000);if(!Number.isInteger(input.revision))throw error('Ugyldig versjon.');const catalog=await readCatalog();let settings;try{settings=validateSiteSettings(input.settings);validateSettingsUsage(settings,catalog.products);}catch(e){throw error(e.message);}const saved=await store.saveSiteSettings(input.revision,settings);if(saved){configureSiteSettings(settings);invalidatePublic();}return saved?out(200,saved):out(409,{error:'Innstillingene er endret i en annen fane. Last inn på nytt før lagring.'});}
     return out(405,{error:'Metoden støttes ikke.'});
    }
    if(pathname==='/api/admin/catalog'){
     if(req.method==='GET')return out(200,await readCatalog());
     if(req.method==='PUT'){const data=await json(req);if(!Number.isInteger(data.revision)||data.revision<0)throw error('Ugyldig katalogversjon.');await readCatalog();const products=validateCatalog(data.products);const result=await store.saveCatalog(data.revision,products);if(result)invalidatePublic();return result?out(200,result):out(409,{error:'Katalogen er endret av en annen administrator. Last inn på nytt før du lagrer.'});}
    }
    if(['/api/admin/media/trash','/api/admin/media/restore'].includes(pathname)&&req.method==='POST'){
     const input=await json(req,5000);if(typeof input.url!=='string'||input.url.length>500)return out(400,{error:'Ugyldig bildelenke.'});images??=staticImages(publicRoot);const purged=await store.purgedMedia(),all=[...(await store.mediaList()),...(await images)].filter(m=>!purged.includes(m.url)),image=all.find(m=>m.url===input.url);if(!image)return out(404,{error:'Bildet finnes ikke.'});
     if(pathname.endsWith('/trash')){const catalog=await readCatalog(),uses=mediaUsage(image,catalog.products,catalog.settings);if(uses.length)return out(409,{error:'Bildet brukes av '+uses.map(p=>p.name+(p.deletedAt?' (i papirkurven)':'')).join(', ')+'. Fjern bildet fra produktene først.'});await store.trashMedia(image.url);}else await store.restoreMedia(image.url);thumbnails.clear();return out(200,{ok:true});
    }
    if(pathname==='/api/admin/media'){
     if(req.method==='GET'){images??=staticImages(publicRoot);const data=await readCatalog();const all=[...(await store.mediaList()),...(await images)],trash=await store.mediaTrashState(),purged=await store.purgedMedia();return out(200,{images:all.filter(m=>!purged.includes(m.url)).map(image=>({...image,deletedAt:trash[image.url]||'',usedBy:mediaUsage(image,data.products,data.settings)}))});}
     if(req.method==='POST'){
      const body=await bytes(req,8*1024*1024),mime=imageMime(body);if(!mime)throw error('Velg JPG, PNG, WebP eller AVIF. SVG og andre filtyper støttes ikke.',415);
      let name;try{name=decodeURIComponent(req.headers['x-filename']||'bilde');}catch{name='bilde';}name=name.replace(/[\x00-\x1f/\\]/g,'').slice(0,180)||'bilde';
      const saved=await store.addMedia(name,mime,body);await store.restoreMedia(saved.url);thumbnails.clear();return out(201,saved);
     }
    }
    if(pathname.startsWith('/api/admin/'))return out(405,{error:'Metoden eller adressen støttes ikke.'});
   }
   if(pathname==='/api/discount/quote'&&req.method==='POST'){
    if(req.headers.origin!==origin)return out(403,{error:'Last inn siden på nytt.'});
    if(!store.enabled)return out(503,{error:'Rabattkoder er ikke tilgjengelige nå.'});
    if(!await store.attempt(digest('discount:'+req.socket.remoteAddress)))return out(429,{error:'For mange forsøk. Vent 15 minutter.'});
    const input=await json(req,20000),catalog=await readCatalog(),discounts=await store.readDiscountCodes();
    const quote=discountQuote(input,catalog.products,discounts.codes);return out(200,quote);
   }
   if(!['GET','HEAD'].includes(req.method))return send(405,'Metoden støttes ikke.');
   if(pathname==='/api/site-settings'){if(req.method!=='GET')return out(405,{error:'Metoden støttes ikke.'});const data=await readPublicCatalog();return out(200,{settings:data.settings});}
   if(pathname==='/api/catalog'){const data=await readPublicCatalog();return out(200,{...data,canAdmin:store.enabled&&await authenticated()});}
   if(pathname.startsWith('/api/'))return out(404,{error:'Fant ikke endepunktet.'});
   const media=pathname.match(/^\/media\/([a-f0-9]{32})$/);
   if(store.enabled&&(pathname.startsWith('/assets/')||media)){
    // Bound database-backed media requests independently of HTML/API traffic.
    if(mediaActive>=16)return send(503,'Bildet er opptatt. Prøv igjen om litt.','text/plain; charset=utf-8',{'Retry-After':'2'});
    mediaActive++;let released=false;const release=()=>{if(!released){released=true;mediaActive--;}};res.once('finish',release);res.once('close',release);
    const purged=store.mediaPurged?await store.mediaPurged(pathname):(await store.purgedMedia()).some(value=>decodeURIComponent(value)===pathname);
    if(purged)return send(404,'Fant ikke bildet.');
   }
   if(media){
    if(!store.enabled)return send(404,'Fant ikke bildet.');
    const requestedWidth=url.searchParams.get('thumb'),width=Number(requestedWidth);
    if(requestedWidth!==null&&!['320','640','1280'].includes(requestedWidth))return send(400,'Ugyldig bildestørrelse.');
    const headers={'Cache-Control':'public, max-age=31536000, immutable','X-Robots-Tag':indexing?'index, follow, max-image-preview:large':'noindex, nofollow, noarchive'};
    if(requestedWidth!==null){
     try{const body=await thumbnails.get(media[1],width,()=>store.media(media[1]));return body?send(200,body,'image/jpeg',headers):send(404,'Fant ikke bildet.');}
     catch{return send(503,'Bildet kunne ikke lastes. Prøv igjen om litt.','text/plain; charset=utf-8',{'Retry-After':'2'});}
    }
    const image=await store.media(media[1]);return image?send(200,image.body,image.mime,headers):send(404,'Fant ikke bildet.');
   }
   if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.')))return await missing();
   if(pathname==='/foresporsel.html'&&['GET','HEAD'].includes(req.method)){const mode=url.searchParams.get('type')==='kjop'?'buy':'rent';return send(200,enquiryPageHtml(await readHtmlTemplate(mode==='buy'?'kjop.html':'utvalg.html'),mode),'text/html; charset=utf-8',{'X-Robots-Tag':'noindex, nofollow, noarchive'});}
   const seoPaths=['/','/utvalg.html','/anledning.html','/kjop.html','/leieprodukt.html','/kjopsprodukt.html','/kundeinfo.html','/midlertidig-moblering.html','/sitemap.xml'];
   if(seoPaths.includes(pathname)&&['GET','HEAD'].includes(req.method)){
    const release=enterRequest(digest(String(req.socket.remoteAddress||'shared')));if(!release)return send(429,'For mange forespørsler. Prøv igjen senere.','text/plain',{'Retry-After':'60'});res.once('finish',release);res.once('close',release);
    const catalog=await readPublicCatalog();
    if(pathname==='/sitemap.xml')return send(200,sitemap(catalog.products,indexing),'application/xml; charset=utf-8');
    const model=pageModel(pathname,url.searchParams,catalog.products);
    const sourcePath=pathname==='/midlertidig-moblering.html'?'/index.html':pathname==='/'?'/index.html':pathname;
    let source=await readHtmlTemplate(sourcePath.slice(1));
    if(model.status===404)return await missing();
    return send(model.status,renderSeo(source,model,catalog.products,indexing,catalog.settings),'text/html; charset=utf-8',{'X-Robots-Tag':indexing&&model.status===200?'index, follow, max-image-preview:large':'noindex, nofollow, noarchive'});
   }
   const target=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(publicRoot+path.sep))return await missing();
   if(pathname==='/404.html')return await missing();
   const type=types[path.extname(target).toLowerCase()];if(!type)return await missing();
   return send(200,await readFile(target),type,pathname.startsWith('/admin/')||path.extname(target)==='.html'?{}:{'Cache-Control':pathname.startsWith('/fonts/')&&path.extname(target)==='.woff2'?'public, max-age=31536000, immutable':'public, max-age=3600'});
  }catch(e){
   if(e.code==='ENOENT'||e.code==='EISDIR')return /\.(?:html)?$/.test(pathname)||!path.extname(pathname)?await missing():send(404,'Fant ikke filen.');
   if(e.status)return out(e.status,{error:e.message});
   if(e.message&&/^Ugyldig|^Katalogen|^Et bildevegg|^Rammene|^Bildeveggoppsett|^Objekt|^En modul|^Oppgi|^Pakker|^Anbefalinger|^Tilvalg|^Priser|^Prisen|^En pakke|^Utilgjengelig|^Bildelenken|^Bruk en/.test(e.message))return out(400,{error:e.message});
   console.error('Admin/katalog: '+(e.code||e.name||'serverfeil'));return out(503,{error:'Kunne ikke kontakte lagringen. Kontroller databaseinnstillinger eller prøv igjen.'});
  }
 });
 const emailTimer=setInterval(()=>void submissions.flush(),60000);emailTimer.unref();
 server.once('listening',()=>void submissions.flush());server.once('close',()=>{clearInterval(emailTimer);submissions.close();});
 server.requestTimeout=30000;server.headersTimeout=15000;server.maxHeadersCount=64;server.maxRequestsPerSocket=200;
 return server;
}
