// Stored independently of product data: one visible card can represent several products.
const scopes=new Set(['boligsalg','messe','bedrift','fest','jul','produksjon','alle']);
export function validateCatalogOrder(value=[]){
 if(!Array.isArray(value)||value.length>500)throw Error('Ugyldig produktrekkefølge.');
 const seen=new Set();
 return value.map(row=>{
  if(!row||!scopes.has(row.purpose)||typeof row.category!=='string'||!row.category||row.category.length>80||/[<>\x00-\x1f]/.test(row.category))throw Error('Ugyldig sorteringsområde.');
  const key=JSON.stringify([row.purpose,row.category]);
  if(seen.has(key)||!Array.isArray(row.ids)||row.ids.length>5000||row.ids.some(id=>typeof id!=='string'||!id||id.length>100)||new Set(row.ids).size!==row.ids.length)throw Error('Ugyldig produktrekkefølge.');
  seen.add(key);return {purpose:row.purpose,category:row.category,ids:[...row.ids]};
 });
}
export const cardProductIds=card=>(card.products?.length?card.products:[card.product||card]).map(p=>p.id).filter(Boolean);
export function applyCatalogOrder(cards,purpose,category,orders=[]){
 const scope=purpose==='event'?'messe':purpose;
 const row=orders.find(r=>r.purpose===scope&&r.category===category)||orders.find(r=>r.purpose===scope&&r.category==='Alle');
 if(!row)return [...cards];
 const ranks=new Map(row.ids.map((id,i)=>[id,i]));
 return cards.map((card,index)=>({card,index,rank:Math.min(...cardProductIds(card).map(id=>ranks.get(id)??Infinity))})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(r=>r.card);
}
export function rememberCardOrder(orders,purpose,category,cards){
 return [...orders.filter(r=>r.purpose!==purpose||r.category!==category),{purpose,category,ids:[...new Set(cards.flatMap(cardProductIds))]}];
}
