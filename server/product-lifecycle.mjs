export function productDependencies(products,id){return products.filter(p=>!p.deletedAt&&p.id!==id).flatMap(p=>{const kinds=[];if(p.components?.some(c=>c.id===id))kinds.push('fast innhold i pakken');if(p.relatedAddOns?.includes(id))kinds.push('valgfritt tilvalg');if(p.relatedPackages?.includes(id))kinds.push('anbefalt pakke');return kinds.length?[{id:p.id,name:p.name,uses:kinds.join(', ')}]:[];});}
export function changeProductLifecycle(products,id,action){
 const p=products.find(p=>p.id===id);const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};if(!p)fail('Produktet finnes ikke.',404);
 if(action==='trash'){
  if(p.deletedAt)fail('Produktet ligger allerede i papirkurven.');
  const uses=productDependencies(products,id);if(uses.length)fail('Produktet brukes av '+uses.map(x=>x.name+' ('+x.uses+')').join(', ')+'. Fjern koblingene før du sletter.');
  return products.map(x=>x.id===id?{...x,active:false,deletedAt:new Date().toISOString()}:x);
 }
 if(action==='restore'){
  if(!p.deletedAt)fail('Produktet ligger ikke i papirkurven.');
  const ids=[...(p.components||[]).map(c=>c.id),...(p.relatedAddOns||[]),...(p.relatedPackages||[])],missing=ids.map(id=>products.find(x=>x.id===id)).filter(x=>!x||x.deletedAt);if(missing.length)fail('Gjenopprett først produktene som denne oppføringen er koblet til: '+missing.map(x=>x?.name||'ukjent produkt').join(', '));
  return products.map(x=>x.id===id?{...x,active:false,deletedAt:''}:x);
 }
 fail('Ugyldig handling.',400);
}
export function validateDeletedAt(raw){const value=raw.deletedAt??'';if(typeof value!=='string'||value&&(!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value))))throw Error('Ugyldig slettedato.');if(value&&raw.active)throw Error('Ugyldig status: et slettet produkt kan ikke vises på nettsiden.');return value;}
