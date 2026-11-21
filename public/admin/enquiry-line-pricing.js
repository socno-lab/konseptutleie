import {ratePlan} from '../catalog-model.js?v=longrent20261026';
import {rentalDayCount} from '../rental-dates.js?v=launch20261024';
import {rentalRateSets} from '../rental-pricing-model.js?v=fest20261114';
export function enquiryLineTotal(product,{quantity,start,end,scope},products){
 const days=rentalDayCount(start,end);
 if(!product||!Number.isInteger(quantity)||quantity<1||quantity>99||!days||days>365||!['standard','messe'].includes(scope))return null;
 const priced=products.map(p=>({...p,...rentalRateSets(p,products)[scope]})),selected=priced.find(p=>p.id===product.id);
 if(!selected||selected.priceOnRequest)return null;
 const plan=ratePlan(selected,days,priced),total=plan?Math.round(plan.total*quantity*100)/100:null;
 return Number.isFinite(total)&&total>=0&&total<=10000000?total:null;
}
