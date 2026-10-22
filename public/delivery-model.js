export const deliveryRates=Object.freeze({normalSingle:690,extendedSingle:890,normalTwo:1190,extendedTwo:1390,normalMinutes:30,maxMinutes:40,vatIncluded:true});
export function requiresTwoPeople(basket,products){
 const byId=new Map(products.map(p=>[p.id,p])),seen=new Set();
 const sofa=id=>{if(seen.has(id))return false;seen.add(id);const p=byId.get(id);if(!p)return false;
  if(p.type==='sofa'||/sofa/i.test(p.category||'')||/\bsofa(?:er|en)?\b|modulsofa|sjeselong/iu.test(p.name||'')||(p.moduleSeries&&['base','left','right','end','middle'].includes(p.moduleRole)))return true;
  return (p.components||[]).some(c=>c.quantity>0&&sofa(c.id));
 };
 return Object.entries(basket||{}).some(([id,q])=>q>0&&sofa(id));
}
export function deliveryPrice(oneWaySeconds,visits,twoPeople=false){
 if(!Number.isFinite(oneWaySeconds)||oneWaySeconds<0||![1,2].includes(visits))throw Object.assign(Error('Frakt må avklares i tilbudet.'),{status:422});
 const minutes=Math.ceil(oneWaySeconds/60),crew=twoPeople?2:1;
 if(oneWaySeconds>2400)return {manual:true,minutes,visits,crew,estimated:true};
 const zone=oneWaySeconds<=1800?'normal':'extended',perVisit=zone==='normal'?(twoPeople?deliveryRates.normalTwo:deliveryRates.normalSingle):(twoPeople?deliveryRates.extendedTwo:deliveryRates.extendedSingle);
 return {manual:false,minutes,zone,crew,visits,perVisit,total:perVisit*visits,vatIncluded:true,estimated:true};
}

export const rentalDeliveryLimits=Object.freeze({sofas:1,modules:3,otherWithSofa:6,withoutSofa:10});
export function rentalDeliveryCapacity(basket,products,customRequest=false){
 const byId=new Map(products.map(p=>[p.id,p]));let sofas=0,modules=0,other=0,unknown=false,steps=0;
 const add=(id,quantity,path=new Set())=>{
  if(!quantity)return;
  if(!Number.isSafeInteger(quantity)||quantity<0||path.has(id)||path.size>30||++steps>10000){unknown=true;return;}
  const p=byId.get(id);if(!p){unknown=true;return;}
  if(p.isPackage){
   if(!Array.isArray(p.components)||!p.components.length){unknown=true;return;}
   const next=new Set(path);next.add(id);for(const c of p.components)add(c.id,quantity*c.quantity,next);return;
  }
  if(p.isService||['dekor','tepper','belysning'].includes(String(p.category||'').trim().toLocaleLowerCase('nb-NO')))return;
  if(p.moduleSeries&&['base','left','right','end','middle'].includes(p.moduleRole)){modules+=quantity*(p.moduleRole==='base'?2:1);return;}
  if(p.type==='sofa'||/sofa/i.test(p.category||'')||/\bsofa(?:er|en)?\b|modulsofa|sjeselong/iu.test(p.name||'')){sofas+=quantity;return;}
  other+=quantity;
 };
 for(const [id,quantity] of Object.entries(basket||{}))add(id,quantity);
 const hasSofa=sofas>0||modules>0,manual=customRequest||unknown||sofas>rentalDeliveryLimits.sofas||modules>rentalDeliveryLimits.modules||(sofas>0&&modules>0)||other>(hasSofa?rentalDeliveryLimits.otherWithSofa:rentalDeliveryLimits.withoutSofa);
 return {manual,sofas,modules,other,reason:customRequest?'custom':unknown?'unknown':manual?'capacity':null};
}
