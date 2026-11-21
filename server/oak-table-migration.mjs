export const oakTableId='obj_80c7c584426643c392320dd08aa4495d';
export const retiredOakTableId='obj_56aef73ccdcc49cfa581b553f4bd77eb';
export const oakTableName='Spisebord, eikefarget, Ø110/Ø120 cm';
export function mergeOakTables(products){
 const base=products.find(p=>p.id===oakTableId),old=products.find(p=>p.id===retiredOakTableId);if(!base||!old)return products;
 return products.filter(p=>p.id!==retiredOakTableId).map(p=>{
 const next={...p};if(p.id===oakTableId){Object.assign(next,{name:oakTableName,stock:(base.stock||0)+(old.stock||0),unavailable:(base.unavailable||0)+(old.unavailable||0),dimensions:{...base.dimensions,diameter:undefined,other:'Diameter: Ø110 eller Ø120 cm. Størrelse kan ikke velges.'},description:'Bordet leveres i Ø110 eller Ø120 cm, avhengig av tilgjengelighet. Størrelse kan ikke velges. '+base.description});}
 if(p.components)next.components=p.components.map(c=>c.id===retiredOakTableId?{...c,id:oakTableId}:c);
 for(const key of ['rentalAlternatives','recommendedProducts'])if(Array.isArray(p[key]))next[key]=[...new Set(p[key].map(id=>id===retiredOakTableId?oakTableId:id))];
 return next;
 });
}
export function mergeOakWorkflow(r){
 const next={...r,lines:r.lines.map(l=>l.id===retiredOakTableId?{...l,id:oakTableId,name:oakTableName,...(l.originalId===retiredOakTableId?{originalId:oakTableId,originalName:oakTableName}:{})}:l)};
 const quantities=new Map();for(const d of r.requirements||[]){const id=d.id===retiredOakTableId?oakTableId:d.id;quantities.set(id,(quantities.get(id)||0)+d.quantity);}next.requirements=[...quantities].map(([id,quantity])=>({id,quantity}));
 if(JSON.stringify(next)===JSON.stringify(r))return r;next.revision++;return next;
}
