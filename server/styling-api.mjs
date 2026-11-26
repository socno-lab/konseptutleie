import {physicalRentalProduct} from './qr-catalog-stock.mjs';
import {productSubcategory} from '../public/catalog-subcategories.js';
import {validateCatalog} from './catalog.mjs';
import {randomBytes,randomUUID} from 'node:crypto';
import {digest,sessionToken,expiredCookie,hashPassword,verifyPassword} from './auth.mjs';
import {adminCookie} from './admin-email-code.mjs';
import {stylingError} from './styling-store.mjs';
import {stylingUsage,usagePeriods} from './styling-usage.mjs';

const cookie='ku_stylist';
const jobId=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const itemId=/^K-[A-F0-9]{16}$/;
const physical=p=>!p.deletedAt&&!p.isService&&!p.isPackage&&!p.isExample;
export async function stylingApi({req,route,store,origin,secure,authenticated,json,out,invalidatePublic=()=>{},sendInvitation=async()=>false}){
  if(!store.enabled)throw stylingError('Lagerdatabasen er utilgjengelig.',503);
  const post=req.method==='POST';
  if(!post && req.method!=='GET')throw stylingError('Metoden støttes ikke.',405);
  if(post && req.headers.origin!==origin)throw stylingError('Last inn siden på nytt.',403);
  const data=post?await json(req,route==='labels-printed'?2000000:route==='review-returns'?40000:4000):{};
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
  if(['counts','count-start','count-scan','count-close','retire'].includes(route)||route.startsWith('count/')){
   if(!admin)throw stylingError('Dette krever administratortilgang.',403);
   if(!post&&route==='counts')return out(200,await store.countSessions());
   if(!post&&route.startsWith('count/')&&jobId.test(route.slice(6)))return out(200,await store.countDetails(route.slice(6)));
   if(post&&route==='count-start'&&typeof data.category==='string'&&data.category.length<=200)return out(201,await store.countStart(data.category,actor));
   if(post&&route==='count-scan'&&jobId.test(data.id)&&itemId.test(data.item))return out(200,await store.countRecord(data.id,data.item));
   if(post&&route==='count-close'&&jobId.test(data.id))return out(200,await store.countClose(data.id));
   if(post&&route==='retire'&&itemId.test(data.id)&&Number.isInteger(data.revision)&&typeof data.reason==='string'){
    const result=await store.retireUnit(data,actor);invalidatePublic();return out(200,result);
   }
   throw stylingError('Ugyldig lagerhandling.');
  }
  if(!post&&route.startsWith('usage/')){
   if(!admin)throw stylingError('Dette krever administratortilgang.',403);
   const period=route.slice(6);
   if(!usagePeriods.has(period))throw stylingError('Velg en gyldig periode.');
   const [catalog,history]=await Promise.all([store.readCatalog(),store.stylingUsageHistory()]);
   return out(200,{products:stylingUsage(catalog.products.filter(physical),history,period)});
  }
  if(!post && route==='overview'){
    const [inventory,catalog,site]=await Promise.all([store.stylingOverview(),store.readCatalog(),store.readSiteSettings?.()]);
    const categories=site?.settings?.categories||[];
    const products=catalog.products.filter(physical).map(p=>{
      const category=categories.find(c=>c.id===p.category);
      const sub=p.subcategory||productSubcategory(p);
      const label=category?.subcategories?.find(s=>s.id===sub)?.label||p.subcategory;
      return {...(p.brand?{brand:p.brand}:{}),...(p.articleNumber?{articleNumber:p.articleNumber}:{}),...(p.moduleRole==='base'&&!p.qrStock?{pairedEnds:true}:{}),...(p.qrStock?{qrStock:true}:{}),...(p.imageBounds?{imageBounds:p.imageBounds}:{}),id:p.id,name:p.name,stock:p.stock,image:p.image,...(admin?{rentalStock:physicalRentalProduct(p),categoryId:p.category}:{}),category:category?.label||p.category,subcategory:label};
    });
    const deletedProducts=new Set(catalog.products.filter(p=>p.deletedAt).map(p=>p.id));
    const items=inventory.items.filter(item=>item.state!=='withdrawn'&&(item.state!=='held'||!deletedProducts.has(item.product)));
    const withdrawn=admin?inventory.items.filter(item=>item.state==='withdrawn'&&!item.retiredReason).map(item=>item.product):[];
    return out(200,{...inventory,items,withdrawn,retired:inventory.items.filter(i=>i.retiredReason).map(({id,name,product,retiredReason,side})=>({id,name,product,retiredReason,side})),baselines:admin&&store.stockBaselines?await store.stockBaselines():{},actor,admin,products,staff:admin?await store.stylists():[]});
  }
  if(post && ['invite','disable'].includes(route)){
    if(!admin)throw stylingError('Dette krever administratortilgang.',403);
    if(!/^[^\s@<>,;:"()\[\]\\]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(email)||email.length>254)throw stylingError('Oppgi en gyldig e-postadresse.');
    if(route==='disable'){await store.stylingDisable(email);return out(200,{ok:true});}
    const key=randomBytes(32).toString('base64url');await store.stylingInvite(email,digest(key),data.replace===true);
    const url=origin+'/styling/index.html#invite='+key;
    return out(201,{url,sent:await sendInvitation(email,url)});
  }
  if(post&&route==='labels-printed'){
    if(!Array.isArray(data.ids)||!data.ids.length||data.ids.length>90000||data.ids.some(id=>typeof id!=='string'||!itemId.test(id)))throw stylingError('Velg gyldige etiketter.');
    await store.stylingConfirmPrinted(data.ids);
    return out(200,{ok:true});
  }
  if(post && route==='jobs'){
    if(typeof data.address!=='string'||!data.address.trim()||data.address.length>200)throw stylingError('Fyll inn oppdragsadressen.');
    return out(201,await store.stylingJob(data.address.trim(),actor));
  }
  if(!post&&route.startsWith('job-returns/')&&jobId.test(route.slice(12))){
    return out(200,await store.stylingJobReturns(route.slice(12)));
  }
  if(post&&route==='review-returns'){
    if(typeof data.id!=='string'||!jobId.test(data.id)||!Array.isArray(data.units)||data.units.length<1||data.units.length>50||
        data.units.some(unit=>!unit||typeof unit.id!=='string'||!itemId.test(unit.id)||!Number.isInteger(unit.revision)||
          (unit.note!==undefined&&(typeof unit.note!=='string'||!unit.note.trim()||unit.note.length>500)))||
        new Set(data.units.map(unit=>unit.id)).size!==data.units.length){
      throw stylingError('Velg opptil 50 returer og skriv en merknad for skadde møbler.');
    }
    await store.stylingReviewReturns(data.id,data.units,actor);
    invalidatePublic();
    return out(200,{ok:true});
  }
  if(post&&route==='close-job'){
    if(typeof data.id!=='string'||!jobId.test(data.id)||typeof data.note!=='string'||data.note.length>500){
      throw stylingError('Velg et gyldig oppdrag og bruk inntil 500 tegn i merknaden.');
    }
    await store.stylingCloseJob(data.id,data.note.trim(),actor);
    return out(200,{ok:true});
  }
  if(post && route==='delete-job'){
    if(!admin)throw stylingError('Dette krever administratortilgang.',403);
    if(typeof data.id!=='string'||!jobId.test(data.id)){
      throw stylingError('Velg et gyldig oppdrag.');
    }
    await store.stylingDeleteJob(data.id);
    return out(200,{ok:true});
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
  if(post&&route==='correct-unused'){
    if(!admin)throw stylingError('Dette krever administratortilgang.',403);
    const product=(await store.readCatalog()).products.find(p=>p.id===data.product&&physical(p));
    if(!product||!Number.isInteger(data.count)||data.count<1||data.count>50||!Number.isInteger(data.expected)||data.expected<data.count||typeof data.restore!=='boolean'){
      throw stylingError('Velg et produkt og mellom 1 og 50 etiketter.');
    }
    const result=await store.stylingCorrectUnused(product.id,data.count,data.expected,data.restore,actor);
    invalidatePublic();
    return out(200,result);
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
  if(post&&route==='checkout-all'){
    if(typeof data.id!=='string'||!jobId.test(data.id))throw stylingError('Velg et gyldig oppdrag.');
    const result=await store.stylingCheckoutAll(data.id,actor);
    invalidatePublic();
    return out(200,result);
  }
  if(post&&route==='transfer'){
    if(!itemId.test(data.id)||!Number.isInteger(data.revision)||!jobId.test(data.fromJob)||!jobId.test(data.job)||data.fromJob===data.job){
      throw stylingError('Velg gyldige oppdrag og møbel.');
    }
    const result=await store.stylingTransfer(data,actor);
    invalidatePublic();
    return out(200,result);
  }
  if(post&&route==='transfer-all'){
    const address=typeof data.address==='string'?data.address.trim():'';
    if(typeof data.fromJob!=='string'||!jobId.test(data.fromJob)||!Number.isSafeInteger(data.count)||data.count<1||
        !Number.isSafeInteger(data.outCount)||data.outCount<0||data.outCount>data.count||
        (data.job!==undefined?(typeof data.job!=='string'||!jobId.test(data.job)||data.fromJob===data.job||Boolean(address)):(!address||address.length>200))){
      throw stylingError('Velg et annet aktivt oppdrag eller fyll inn den nye adressen.');
    }
    const result=await store.stylingTransferAll({...data,address},actor);
    invalidatePublic();
    return out(200,result);
  }
  if(post && route==='move'){
    if(!itemId.test(data.id)||!Number.isInteger(data.revision)|| (['in','out','scan','assign','unassign'].includes(data.action)&& !jobId.test(data.job)))throw stylingError('Velg oppdrag og møbel.');
    const result=await store.stylingMove(data,actor);
    invalidatePublic();
    return out(200,result);
  }
  if(!post && route.startsWith('history/') && itemId.test(route.slice(8)))return out(200,await store.stylingHistory(route.slice(8)));
  throw stylingError('Fant ikke handlingen.',404);
}
