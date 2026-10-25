import {ratePlan} from './catalog-model.js?v=launch20261024';
export function packageLineRentalPrice(product,quantity,days,products,money){
 if(product.priceOnRequest)return 'Pris på forespørsel';
 if(Number.isInteger(days)&&days>0){const plan=ratePlan(product,days,products);return plan?money(plan.total*quantity)+' for '+quantity+' stk. · '+days+' døgn':'Pris på forespørsel';}
 return money(product.price)+' / døgn · '+money(product.weekPrice??product.price*5)+' / uke · '+money(product.monthPrice??product.price*15)+' / måned per stk.';
}
