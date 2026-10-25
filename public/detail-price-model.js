import {ratePlan} from './catalog-model.js?v=launch20261024';

// Sum the actual lines for each duration. A 30-day addon is not a daily rate,
// and cannot be blended into furniture rates before finding the cheapest plan.
export function detailSelectionPrices(base,quantity,extras,products,days=null){
 const counts={[base.id]:quantity};
 for(const [id,q] of Object.entries(extras||{}))counts[id]=(counts[id]||0)+q;
 const lines=Object.entries(counts).filter(([,q])=>q!==0).map(([id,q])=>({product:products.find(p=>p.id===id),quantity:q}));
 const valid=Number.isInteger(quantity)&&quantity>0&&Object.values(extras||{}).every(q=>Number.isInteger(q)&&q>=0)&&lines.every(l=>l.product&&Number.isInteger(l.quantity)&&l.quantity>0);
 const at=duration=>{
  if(!valid)return null;
  let cents=0;for(const {product,quantity} of lines){
   const plan=product.priceOnRequest?null:ratePlan(product,duration,products);
   if(!plan||!Number.isFinite(plan.total)||plan.total<0)return null;
   cents+=Math.round(plan.total*100)*quantity;
  }
  return cents/100;
 };
 return {valid,price:at(1),weekPrice:at(7),monthPrice:at(30),selectedTotal:Number.isInteger(days)&&days>0?at(days):null,days,hasExtras:Object.values(extras||{}).some(q=>q>0),hasPeriodExtras:Object.entries(extras||{}).some(([id,q])=>q>0&&products.find(p=>p.id===id)?.rentalPricingMode==='period')};
}
