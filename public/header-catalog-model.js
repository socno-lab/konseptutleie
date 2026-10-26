import {salesEnabled} from './sales-model.js?v=launch20261024';
import {variantFields,productVariants} from './product-variants.js?v=launch20261024';
import {productPageUrl} from './product-page-model.js?v=launch20261024';
import {moduleCardImage} from './module-card-image.js?v=sofaframes20261025';
import {isWall} from './wall-model.js?v=launch20261024';
import {isServiceOffering} from './service-model.js?v=launch20261024';
import {categoryLabel} from './site-settings.js';

const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const normalized=value=>String(value??'').toLocaleLowerCase('nb').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('æ','ae').replaceAll('ø','o').replace(/[^a-z0-9]+/g,' ').trim();
const order=(a,b)=>(a.sortOrder||0)-(b.sortOrder||0);
const moduleRoleRank=p=>p.moduleRequired?0:({base:1,left:2,end:2,corner:3,middle:4,right:5,chaise:6}[p.moduleRole]??7);
const categoryAliases={
 Sofaer:['sofa','sofaer','modulsofa','modulsofaer','sovesofa','sovesofaer'],
 Bord:['bord','sofabord','spisebord','sidebord','nattbord','skrivebord','konsollbord','ståbord'],
 Senger:['seng','senger','barneseng','sprinkelseng'],
 Stoler:['stol','stoler','loungestol','loungestoler','lenestol','lenestoler','spisestol','spisestoler','barkrakk','barkrakker','puff','puffer','benk','benker'],
 Utemøbler:['utemøbel','utemøbler','utemodul','utemoduler','loungemodul','loungemoduler'],
 Belysning:['belysning','lampe','lamper','bordlampe','bordlamper','gulvlampe','gulvlamper','taklampe','taklamper'],
 Hyller:['hylle','hyller','skap','kommode','kommoder','klesstativ','klesstativer'],
 Tepper:['teppe','tepper','gulvteppe','gulvtepper'],
 Bilder:['bilde','bilder','bildevegg','bildevegger'],
 Pakker:['pakke','pakker','ferdig pakke','ferdige pakker','tjeneste','tjenester','pakker og tjenester'],
 'Kunstige planter':['kunstig plante','kunstige planter','plante','planter','kunstig tre','kunstige trær'],
 'Kunstige blomster':['kunstig blomst','kunstige blomster','blomst','blomster']
};
const categoryTitle=category=>categoryLabel(category)==='Pakker'?'Pakker og tjenester':categoryLabel(category);
const aliasesFor=category=>[category,categoryTitle(category),...(categoryAliases[category]||[])].map(normalized);
// Narrow product matching to the category itself. A “sofabord” query can offer
// navigation to Bord, but it must not make every dining table a product match.
const productCategoryAliases={Sofaer:['sofa'],Bord:[],Senger:['seng'],Stoler:['stol'],Utemøbler:['utemøbel'],Belysning:['lampe','lamper'],Hyller:['hylle'],Tepper:['teppe'],Bilder:['bilde'],Pakker:['pakke','ferdig pakke','ferdige pakker','tjeneste','tjenester'],'Kunstige planter':['plante','planter'],'Kunstige blomster':['blomst','blomster']};
const aliasesForProduct=entry=>[
 ...entryCategories(entry).flatMap(({category})=>[category,categoryTitle(category),...(productCategoryAliases[category]||[])]),
 ...(entry.kind==='module'&&entryCategories(entry).some(c=>c.category==='Sofaer')?['modulsofa','modulsofaer']:[])
].map(normalized);
const queryText=query=>normalized(typeof query==='string'?query.slice(0,200):'');
const entryCategories=entry=>Array.isArray(entry.categories)?entry.categories:[{category:entry.category,rentable:entry.rentable,purchasable:entry.purchasable}];

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
  const categories=[...new Set(members.map(p=>p.category).filter(Boolean))].map(category=>({category,rentable:members.some(p=>p.category===category&&p.rentalEnabled!==false),purchasable:members.some(p=>p.category===category&&salesEnabled(p))}));
  const searchText=normalized([title,...members.flatMap(p=>[p.name,p.material,p.category,categoryTitle(p.category),p.subcategory,p.moduleSeries,p.wallGroup,p.serviceGroup,p.serviceVariant,variantFields(p).variantLabel,...(Array.isArray(p.includes)?p.includes:[]),...(Array.isArray(p.components)?p.components.map(c=>byId.get(c.id)?.name):[])])].join(' '));
  return {id:key,title,image:image||'',category:first.category||'',categories,kind,productIds:ordered.map(p=>p.id),rentHref:rent?productPageUrl(rent.id,'rent',{bruk:'alle'}):'',buyHref:buy?productPageUrl(buy.id,'buy'):'',rentable:!!rent,purchasable:!!buy,searchText};
 });
}

export function searchHeaderCatalog(entries,query,limit=8){
 const text=queryText(query);
 if(!text||!Array.isArray(entries))return [];
 const tokens=text.split(' '),max=Number.isInteger(limit)?Math.min(100,Math.max(0,limit)):8;
 return entries.map((entry,index)=>{
  const title=normalized(entry.title),titleWords=title.split(' '),searchWords=normalized(entry.searchText).split(' '),aliases=aliasesForProduct(entry);
  // Whole words and category aliases outrank partial compound words. Thus “sofa”
  // finds all Sofaer families before a Sofabord, even if its title omits “sofa”.
  const scores=tokens.map(token=>titleWords.includes(token)?0:aliases.includes(token)?2:searchWords.includes(token)?4:titleWords.some(word=>word.startsWith(token))?8:searchWords.some(word=>word.startsWith(token))?10:title.includes(token)?16:entry.searchText.includes(token)?18:Infinity);
  const score=scores.reduce((sum,value)=>sum+value,0)-(title===text?20:0);
  return {entry,index,score,partialCount:scores.filter(value=>value>=8).length};
 }).filter(result=>Number.isFinite(result.score)).sort((a,b)=>a.partialCount-b.partialCount||a.score-b.score||a.index-b.index).slice(0,max).map(result=>result.entry);
}

// Category results are separate navigation choices, never product/favorite IDs.
export function searchHeaderCategories(entries,query){
 const text=queryText(query);
 if(!text||!Array.isArray(entries))return [];
 const categories=new Map();
 for(const entry of entries)for(const facet of entryCategories(entry)){
  if(!facet.category||!facet.rentable&&!facet.purchasable)continue;
  if(!categories.has(facet.category))categories.set(facet.category,{category:facet.category,rentable:false,purchasable:false});
  const category=categories.get(facet.category);
  category.rentable||=facet.rentable;category.purchasable||=facet.purchasable;
 }
 const tokens=text.split(' '),matches=[...categories.values()].map((entry,index)=>{
  const aliases=aliasesFor(entry.category),score=aliases.includes(text)?0:text.length>1&&aliases.some(alias=>tokens.every(token=>alias.split(' ').some(word=>word.startsWith(token))))?1:Infinity;
  return {entry,index,score};
 }).filter(result=>Number.isFinite(result.score));
 // A known category word must not fall through to another category's compound
 // alias just because the requested category currently has no active products.
 const exact=matches.some(result=>result.score===0)||Object.keys(categoryAliases).some(category=>aliasesFor(category).includes(text));
 return matches.filter(result=>!exact||result.score===0).sort((a,b)=>a.score-b.score||a.index-b.index).map(({entry})=>({
  category:entry.category,title:categoryTitle(entry.category),
  rentHref:entry.rentable?'/utvalg.html?bruk=alle&kategori='+encode(entry.category)+'#utvalg':'',
  buyHref:entry.purchasable?'/kjop.html?kategori='+encode(entry.category):''
 }));
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
