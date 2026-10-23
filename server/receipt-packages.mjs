import {ratePlan,rentalDays,planText} from '../public/catalog-model.js';
// Expand display lines only. Preserve the already calculated package total exactly.
export function receiptPackageLines(lines,products,groups,start,end){
 const remaining=lines.map(l=>({...l})),out=[];
 const take=(id,q,group)=>{const line=remaining.find(l=>l.id===id&&l.quantity);if(!line)return;const n=Math.min(q,line.quantity),total=line.total===null?null:Math.round(line.total*n/line.quantity*100)/100;out.push({...line,quantity:n,total,group});line.quantity-=n;if(line.total!==null)line.total=Math.round((line.total-total)*100)/100;};
 for(const g of groups){const group={id:g.id,name:g.name,quantity:g.quantity};
  if(g.custom){for(const [id,q] of Object.entries(g.selection))take(id,q,group);continue;}
  const line=remaining.find(l=>l.id===g.packageId&&l.quantity),p=products.find(p=>p.id===g.packageId);if(!line||!p?.components?.length||p.isProposal)continue;
  const children=p.components.map(c=>{const item=products.find(p=>p.id===c.id),plan=item&&!item.priceOnRequest?ratePlan(item,rentalDays(start,end),products):null;return {id:c.id,name:item?.name||'Produkt',quantity:c.quantity*line.quantity,basis:plan?new Intl.NumberFormat('nb-NO').format(plan.total)+' kr per stk. · '+planText(plan):'Andel av pakkepris',weight:plan?plan.total*c.quantity:0};});
  const weight=children.reduce((n,c)=>n+c.weight,0),cents=line.total===null?null:Math.round(line.total*100);let used=0;
  children.forEach((c,i)=>{const amount=cents===null?null:i===children.length-1?cents-used:Math.floor(cents*(weight?c.weight/weight:c.quantity/children.reduce((n,x)=>n+x.quantity,0))+1e-7);if(amount!==null)used+=amount;const {weight:_,...child}=c;out.push({...child,total:amount===null?null:amount/100,group,...(amount!==null&&c.weight&&Math.abs(amount/100-c.weight*line.quantity)>.01?{basis:'Andel av samlet pakkepris'}:{})});});
  line.quantity=0;for(const [id,q] of Object.entries(g.extras||{}))take(id,q,group);
 }
 return [...out,...remaining.filter(l=>l.quantity)];
}
