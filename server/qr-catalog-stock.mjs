export function physicalRentalProduct(p){
 return !p.deletedAt&&!p.isPackage&&p.offeringType!=='service'&&!p.isService&&!p.isExample&&!p.addonOnly&&!p.wallGroup&&p.rentalEnabled!==false;
}

// A left and a right end module together represent one complete base sofa.
export function inventoryCounts(rows){
 const byProduct=new Map();
 for(const row of rows){
  if(!byProduct.has(row.product))byProduct.set(row.product,{});
  byProduct.get(row.product)[row.side||'whole']=row;
 }
 const result=new Map();
 for(const [product,parts] of byProduct){
  const count=field=>Number(parts.whole?.[field]||0)+Math.min(Number(parts.left?.[field]||0),Number(parts.right?.[field]||0));
  result.set(product,{total:count('total'),ready:count('ready'),confirmed:count('confirmed')});
 }
 return result;
}

// A registration used to start in 'ready'. Only a later approval from 'held'
// confirms that the physical unit has been checked into the warehouse.
export const confirmedCheckInSQL=`EXISTS (SELECT 1 FROM ku_styling_history h
 WHERE h.item=i.id AND h.state='ready' AND 'held'=(
   SELECT prev.state FROM ku_styling_history prev WHERE prev.item=h.item AND prev.id<h.id ORDER BY prev.id DESC LIMIT 1
 ))`;

export async function promoteConfirmedStock(db,products,onlyProduct){
 const candidates=products.filter(p=>(!onlyProduct||p.id===onlyProduct)&&physicalRentalProduct(p));
 if(!candidates.length)return;
 const [rows]=await db.execute(`SELECT i.product,s.side,COUNT(*) AS confirmed
   FROM ku_styling_items i LEFT JOIN ku_styling_item_sides s ON s.item=i.id
   WHERE i.state<>'withdrawn' AND NOT EXISTS (SELECT 1 FROM ku_styling_catalog_stock m WHERE m.product=i.product)
   AND ${confirmedCheckInSQL}
   ${onlyProduct?'AND i.product=?':''} GROUP BY i.product,s.side`,onlyProduct?[onlyProduct]:[]);
 const counts=inventoryCounts(rows);
 for(const product of candidates){
  if((counts.get(product.id)?.confirmed||0)>=Math.max(1,product.stock||0))
   await db.execute('INSERT IGNORE INTO ku_styling_catalog_stock(product) VALUES (?)',[product.id]);
 }
}
