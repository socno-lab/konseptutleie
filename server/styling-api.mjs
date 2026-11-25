import {productSubcategory} from '../public/catalog-subcategories.js';
import {validateCatalog} from './catalog.mjs';
import {randomBytes,randomUUID} from 'node:crypto';
import {digest,sessionToken,expiredCookie,hashPassword,verifyPassword} from './auth.mjs';
import {adminCookie} from './admin-email-code.mjs';
import {stylingError} from './styling-store.mjs';

const cookie='ku_stylist';
const itemId=/^K-[A-F0-9]{16}$/;
const physical=p=>!p.deletedAt&&!p.isService&&!p.isPackage&&!p.isExample;
export async function stylingApi({req,route,store,origin,secure,authenticated,json,out,invalidatePublic=()=>{}}){
  if(!store.enabled)throw stylingError('Lagerdatabasen er utilgjengelig.',503);
  const post=req.method==='POST';
  if(!post && req.method!=='GET')throw stylingError('Metoden støttes ikke.',405);
  if(post && req.headers.origin!==origin)throw stylingError('Last inn siden på nytt.',403);
  const data=post?await json(req,4000):{};
  const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  const token=sessionToken(req,cookie);
  if(post && ['login','claim'].includes(route)){
    const bucket=digest('styling-auth:'+req.socket.remoteAddress);
    if(!await store.attempt(bucket))throw stylingError('For mange forsøk. Prøv igjen senere.',429);
    if(typeof data.password!=='string'||data.password.length>128)throw stylingError('Ugyldig passord.');
    if(route==='claim'){
      if(data.password.length<12||! /^[\w-]{43}$/.test(data.invitation))throw stylingError('Kontroller invitasjonen og bruk minst 12 tegn i passordet.');
      await store.stylingClaim(digest(data.invitation),await hashPassword(data.password));return out(200,{ok:true});
    }
    const password=await store.stylingPassword(email);
    if(!password||!await verifyPassword(data.password,password))throw stylingError('Feil e-post eller passord.',401);
    const session=randomBytes(32).toString('base64url');await store.stylingSignIn(email,password,digest(session));await store.resetAttempts(bucket);
    return out(200,{ok:true},{'Set-Cookie':adminCookie(cookie,session,secure,28800)});
  }
  if(post && route==='logout'){
    if(token)await store.stylingSignOut(digest(token));return out(200,{ok:true},{'Set-Cookie':expiredCookie(cookie,secure)});
  }
  const admin=await authenticated();
  const actor=admin?(await store.admin()).email:token.length===43&&await store.stylingSession(digest(token));
  if(!actor)throw stylingError('Logg inn for å fortsette.',401);
  if(!post && route==='overview'){
    const [inventory,catalog,site]=await Promise.all([store.stylingOverview(),store.readCatalog(),store.readSiteSettings?.()]);
    const categories=site?.settings?.categories||[];
    const products=catalog.products.filter(physical).map(p=>{
      const category=categories.find(c=>c.id===p.category);
      const sub=p.subcategory||productSubcategory(p);
      const label=category?.subcategories?.find(s=>s.id===sub)?.label||p.subcategory;
      return {...(p.articleNumber?{articleNumber:p.articleNumber}:{}),...(p.moduleRole==='base'&&!p.qrStock?{pairedEnds:true}:{}),...(p.qrStock?{qrStock:true}:{}),...(p.imageBounds?{imageBounds:p.imageBounds}:{}),id:p.id,name:p.name,stock:p.stock,image:p.image,category:category?.label||p.category,subcategory:label};
    });
    const deletedProducts=new Set(catalog.products.filter(p=>p.deletedAt).map(p=>p.id));
    const items=inventory.items.filter(item=>item.state!=='held'||!deletedProducts.has(item.product));
    return out(200,{...inventory,items,actor,admin,products,staff:admin?await store.stylists():[]});
  }
  if(post && ['invite','disable'].includes(route)){
    if(!admin)throw stylingError('Dette krever administratortilgang.',403);
    if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254)throw stylingError('Oppgi en gyldig e-postadresse.');
    if(route==='disable'){await store.stylingDisable(email);return out(200,{ok:true});}
    const key=randomBytes(32).toString('base64url');await store.stylingInvite(email,digest(key));
    return out(201,{url:origin+'/styling/index.html#invite='+key});
  }
  if(post && route==='jobs'){
    if(typeof data.address!=='string'||!data.address.trim()||data.address.length>200)throw stylingError('Fyll inn oppdragsadressen.');
    return out(201,await store.stylingJob(data.address.trim(),actor));
  }
  if(post && route==='draft'){
    if(typeof data.name!=='string'||!data.name.trim()||data.name.length>100)throw stylingError('Skriv inn et produktnavn på inntil 100 tegn.');
    const name=data.name.trim(),catalog=await store.readCatalog();
    if(catalog.products.some(p=>!p.deletedAt && p.name.toLowerCase()===name.toLowerCase()))throw stylingError('Navnet finnes allerede. Velg produktet i katalogen.',409);
    if(catalog.products.length>=500)throw stylingError('Katalogen er full.',409);
    const [draft]=validateCatalog([{id:'obj_'+randomUUID().replaceAll('-',''),name,articleNumber:data.articleNumber,category:'Annet',material:'',description:'',price:0,weekPrice:0,monthPrice:0,priceOnRequest:true,isExample:false,isService:false,isPackage:false,active:false,type:'generic',color:'#b5ad99',stock:0,unavailable:0,image:'',gallery:[]}]);
    const saved=await store.saveCatalog(catalog.revision,[...catalog.products,draft]);
    if(!saved)throw stylingError('Katalogen er endret. Prøv igjen.',409);
    return out(201,{id:draft.id});
  }
  if(post && route==='items'){
    const product=(await store.readCatalog()).products.find(p=>p.id===data.product&&physical(p));
    if(!product||!Number.isInteger(data.count)||data.count<1||data.count>50)throw stylingError('Velg et produkt og mellom 1 og 50 etiketter.');
    const result=await store.stylingRegister(product,data.count,actor);
    if(product.qrStock)invalidatePublic();
    return out(201,result);
  }
  if(post && route==='split'){
    if(!itemId.test(data.id)||!Number.isInteger(data.revision))throw stylingError('Velg grunnsofa.');
    return out(201,await store.stylingSplit(data.id,data.revision,(await store.readCatalog()).products.filter(physical),actor));
  }
  if(post && route==='move'){
    if(!itemId.test(data.id)||!Number.isInteger(data.revision)|| (['in','out'].includes(data.action)&& !/^[a-f0-9-]{36}$/.test(data.job)))throw stylingError('Velg oppdrag og møbel.');
    const result=await store.stylingMove(data,actor);
    invalidatePublic();
    return out(200,result);
  }
  if(!post && route.startsWith('history/') && itemId.test(route.slice(8)))return out(200,await store.stylingHistory(route.slice(8)));
  throw stylingError('Fant ikke handlingen.',404);
}
