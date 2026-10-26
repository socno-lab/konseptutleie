import {salesEnabled} from './sales-model.js?v=launch20261024';
import {variantFields,productVariants} from './product-variants.js?v=launch20261024';
import {productPageUrl} from './product-page-model.js?v=launch20261024';
import {moduleCardImage} from './module-card-image.js?v=sofaframes20261025';
import {isWall} from './wall-model.js?v=launch20261024';
import {isServiceOffering} from './service-model.js?v=launch20261024';

const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const normalized=value=>String(value??'').toLocaleLowerCase('nb').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('æ','ae').replaceAll('ø','o').replace(/[^a-z0-9]+/g,' ').trim();
const order=(a,b)=>(a.sortOrder||0)-(b.sortOrder||0);
const moduleRoleRank=p=>p.moduleRequired?0:({base:1,left:2,end:2,corner:3,middle:4,right:5,chaise:6}[p.moduleRole]??7);

function family(p,products){
 if(p.moduleSeries)return {kind:'module',key:'module:'+encode(p.moduleSeries),title:p.moduleSeries};
 if(isWall(p))return {kind:'wall',key:'wall:'+encode(p.wallGroup),title:p.wallGroup==='Bildevegg'?'Bildevegg satt sammen av stylist':p.wallGroup};
 if(isServiceOffering(p)&&p.serviceGroup)return {kind:'service',key:'service:'+encode(p.serviceGroup),title:p.serviceGroup};
 const group=variantFields(p).variantGroup;
 if(group&&!p.isPackage&&!p.addonOnly&&!p.wallGroup){
  const leader=productVariants(p,products)[0]||p,display=leader.variantDisplay||'auto';
  if(display!=='separate'&&(display!=='auto'||p.category==='Belysning'))return {kind:'variant',key:'variant:'+encode(p.category)+':'+encode(group),title:group};
 }
 return {kind:p.isPackage?'package':'product',key:'product:'+encode(p.id),title:p.name};
}

// Uses the same product families and product-page routes as the catalogues.
// Mode links are chosen separately: a sale-only colour must not become a rental link.
export function buildHeaderCatalog(products){
 if(!Array.isArray(products))return [];
 const active=products.filter(p=>p&&typeof p.id==='string'&&p.active&&!p.deletedAt);
 const legacyAddons=new Set(active.flatMap(p=>Array.isArray(p.relatedAddOns)?p.relatedAddOns:[]));
 const visible=active.filter(p=>!p.addonOnly&&!(legacyAddons.has(p.id)&&p.isService&&p.category!=='Kunstige blomster'&&p.rentalPricingMode!=='period')&&(p.rentalEnabled!==false||salesEnabled(p)));
 const groups=new Map();
 for(const p of [...visible].sort(order)){
  const info=family(p,visible);
  if(!groups.has(info.key))groups.set(info.key,{...info,members:[]});
  groups.get(info.key).members.push(p);
 }
 const byId=new Map(active.map(p=>[p.id,p]));
 return [...groups.values()].map(({key,kind,title,members})=>{
  const ordered=[...members].sort((a,b)=>kind==='module'?moduleRoleRank(a)-moduleRoleRank(b)||order(a,b):kind==='wall'?(a.wallOrder||0)-(b.wallOrder||0)||order(a,b):kind==='service'?(a.serviceOrder||0)-(b.serviceOrder||0)||order(a,b):kind==='variant'?(a.variantOrder||0)-(b.variantOrder||0)||variantFields(a).variantLabel.localeCompare(variantFields(b).variantLabel,'nb')||order(a,b):order(a,b));
  const first=ordered[0],rent=ordered.find(p=>p.rentalEnabled!==false),buy=ordered.find(salesEnabled);
  const image=kind==='module'?moduleCardImage(members):kind==='wall'?ordered.find(p=>p.wallCover)?.wallCover||first.image:first.image;
  const searchText=normalized([title,...members.flatMap(p=>[p.name,p.material,p.category,p.subcategory,p.moduleSeries,p.wallGroup,p.serviceGroup,p.serviceVariant,variantFields(p).variantLabel,...(Array.isArray(p.includes)?p.includes:[]),...(Array.isArray(p.components)?p.components.map(c=>byId.get(c.id)?.name):[])])].join(' '));
  return {id:key,title,image:image||'',category:first.category||'',kind,productIds:ordered.map(p=>p.id),rentHref:rent?productPageUrl(rent.id,'rent',{bruk:'alle'}):'',buyHref:buy?productPageUrl(buy.id,'buy'):'',rentable:!!rent,purchasable:!!buy,searchText};
 });
}

export function searchHeaderCatalog(entries,query,limit=8){
 const text=normalized(typeof query==='string'?query.slice(0,200):'');
 if(!text||!Array.isArray(entries))return [];
 const tokens=text.split(' '),max=Number.isInteger(limit)?Math.min(100,Math.max(0,limit)):8;
 return entries.filter(entry=>tokens.every(token=>entry.searchText.includes(token))).map((entry,index)=>{
  const title=normalized(entry.title),score=title===text?0:title.startsWith(text)?1:tokens.every(token=>title.includes(token))?2:3;
  return {entry,index,score};
 }).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,max).map(result=>result.entry);
}

function validFavoriteId(value){
 if(typeof value!=='string'||value.length>1500)return false;
 const parts=value.split(':'),kind=parts.shift();
 if(!['product','module','wall','service','variant'].includes(kind)||parts.length!==(kind==='variant'?2:1))return false;
 if(kind==='product')return /^[a-z0-9_-]{1,80}$/.test(parts[0]);
 return parts.every(part=>{
  if(!part||!/^[A-Za-z0-9_.~%-]+$/.test(part))return false;
  try{const decoded=decodeURIComponent(part);return decoded.length<=200&&decoded.trim()===decoded&&!/[<>\x00-\x1f\x7f]/.test(decoded)&&encode(decoded)===part&&decoded!=='.'&&decoded!=='..';}catch{return false;}
 });
}

// Storage is untrusted. Do not accept strings, objects or unbounded lists as IDs.
export function cleanFavoriteIds(value){
 if(!Array.isArray(value))return [];
 const result=[],seen=new Set();
 for(const id of value.slice(0,1000)){
  if(!validFavoriteId(id)||seen.has(id))continue;
  result.push(id);seen.add(id);
  if(result.length===100)break;
 }
 return result;
}
