import {sofaConfiguration} from '../public/sofa-model.js';
const fail=()=>{throw Object.assign(Error('Kontroller sofaoppsettene og tilvalgene i handlekurven.'),{status:400});};

// Annotate existing, server-priced quantities. A setup never creates a price or
// claims products already allocated to a package, another sofa, or a purchase.
export function receiptSofaLines(lines,raw,products){
 if(raw===undefined)return lines;
 if(!Array.isArray(raw)||raw.length>50)fail();
 if(!raw.length)return lines;
 const remaining=lines.map(line=>({...line})),out=[],seen=new Set();
 const take=(id,quantity,group,extra=false,parentId='')=>{
  const line=remaining.find(line=>line.id===id&&!line.group&&line.quantity>=quantity);if(!line)fail();
  const total=line.total===null?null:Math.round(line.total*quantity/line.quantity*100)/100;
  const copy={...line,quantity,total,group};
  if(extra)copy.addonFor=[{id:parentId,name:group.name}];else delete copy.addonFor;
  out.push(copy);line.quantity-=quantity;if(line.total!==null)line.total=Math.round((line.total-total)*100)/100;
 };
 for(const [index,s] of raw.entries()){
  if(!s||typeof s!=='object'||Array.isArray(s)||typeof s.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(s.id)||seen.has(s.id)||typeof s.series!=='string'||!s.series||s.series.length>80||!s.selection||typeof s.selection!=='object'||Array.isArray(s.selection)||!Object.keys(s.selection).length||Object.keys(s.selection).length>150||s.textileId!==undefined&&typeof s.textileId!=='string')fail();
  seen.add(s.id);
  const selection={};
  for(const [id,q] of Object.entries(s.selection)){
   const p=products.find(p=>p.id===id&&p.moduleSeries===s.series&&p.active&&!p.deletedAt&&p.rentalEnabled!==false&&!p.isPackage&&!p.addonOnly);
   if(!p||!Number.isInteger(q)||q<1||q>99)fail();selection[id]=q;
  }
  const setup={id:s.id,series:s.series,selection,textileId:s.textileId||''},config=sofaConfiguration(setup,{},products);
  if(!config.valid||setup.textileId&&products.find(p=>p.id===setup.textileId)?.rentalEnabled===false||setup.textileId&&products.find(p=>p.id===setup.textileId)?.deletedAt)fail();
  const modules=products.filter(p=>selection[p.id]),outdoor=modules.some(p=>p.category==='Utemøbler');
  const group={id:'rental-sofa:'+s.id,type:'sofa',name:s.series+' · '+(outdoor?'Lounge ':'Sofa ')+(index+1),quantity:1,description:config.count+' moduler'+(config.widthKnown?' · ca. '+config.width+' cm bred':'')};
  if(remaining.some(line=>line.group?.id===group.id))fail();
  for(const p of modules)take(p.id,selection[p.id],group);
  if(setup.textileId)take(setup.textileId,1,group,true,modules.at(-1).id);
 }
 return [...out,...remaining.filter(line=>line.quantity>0)];
}
