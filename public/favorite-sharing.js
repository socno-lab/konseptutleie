import {cleanFavoriteIds} from './header-catalog-model.js?v=fest20261114';

const prefix='#favoritter=',version='v1.',maxItems=100,productIdPattern=/^[a-z0-9_-]{1,80}$/;
const validProductId=value=>typeof value==='string'&&productIdPattern.test(value);

// A share contains public product IDs only. The URL fragment is not sent with
// HTTP requests, and opening it never writes to the recipient's saved favorites.
export function parseSharedFavorites(hash){
 if(typeof hash!=='string'||!hash.startsWith(prefix))return null;
 const invalid={valid:false,productIds:[]};
 if(hash.length>prefix.length+version.length+maxItems*81)return invalid;
 const payload=hash.slice(prefix.length);
 if(!payload.startsWith(version))return invalid;
 const productIds=payload.slice(version.length).split('.');
 if(!productIds.length||productIds.length>maxItems||!productIds.every(validProductId))return invalid;
 return {valid:true,productIds:[...new Set(productIds)]};
}

export function favoriteShareUrl(favoriteIds,entries,origin){
 const catalogue=new Map((Array.isArray(entries)?entries:[]).map(entry=>[entry.id,entry]));
 const productIds=cleanFavoriteIds(favoriteIds).map(id=>catalogue.get(id)?.productIds?.find(validProductId)).filter(Boolean);
 if(!productIds.length)return '';
 try{
  const url=new URL('/',origin);
  if(!['https:','http:'].includes(url.protocol))return '';
  url.hash=prefix.slice(1)+version+[...new Set(productIds)].join('.');
  return url.href;
 }catch{return '';}
}

export function resolveSharedFavorites(shared,entries){
 if(!shared?.valid||!Array.isArray(shared.productIds)||!Array.isArray(entries))return {entries:[],missing:0};
 const byProduct=new Map(entries.flatMap(entry=>entry.productIds.map(id=>[id,entry]))),found=[],seen=new Set();let missing=0;
 for(const id of shared.productIds){
  const entry=byProduct.get(id);
  if(!entry){missing++;continue;}
  if(!seen.has(entry.id)){found.push(entry);seen.add(entry.id);}
 }
 return {entries:found,missing};
}

// This is used only after an explicit save action. Existing choices stay first;
// a full local list is never replaced by someone else's shared selection.
export function mergeSharedFavorites(existing,incoming){
 const ids=cleanFavoriteIds(existing),seen=new Set(ids);let added=0,skipped=0;
 for(const id of cleanFavoriteIds(incoming)){
  if(seen.has(id))continue;
  if(ids.length===maxItems){skipped++;continue;}
  ids.push(id);seen.add(id);added++;
 }
 return {ids,added,skipped};
}
