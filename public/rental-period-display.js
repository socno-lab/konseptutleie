import {ratePlan} from './catalog-model.js?v=longrent20261026';
import {parseDateOnly,validateRentalPeriod} from './rental-dates.js?v=launch20261024';
import {priceMarkup} from './price-display-model.js?v=vatdefault20261116';

const escapePeriod=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function readSavedRentalPeriod(storage,options={}){
 let draft={};try{const value=JSON.parse(storage?.getItem('konsept-enquiry-draft-rent')||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))draft=value;}catch{}
 try{const saved=JSON.parse(globalThis.localStorage?.getItem('konsept-rental-period-v1')||'{}');for(const name of ['start','end'])if(!draft[name]&&typeof saved[name]==='string')draft[name]=saved[name];}catch{}
 // Restoring into the live <input type="date"> clears invalid calendar values.
 const start=parseDateOnly(draft.start)!==null?draft.start:'',end=parseDateOnly(draft.end)!==null?draft.end:'';
 if(!start&&!end)return {start,end,days:null,message:'Velg leieperiode for å se beregnet leiesum.'};
 try{return {...validateRentalPeriod(start,end,options),message:''};}catch(error){return {start,end,days:null,message:error.message};}
}

// Only the public tariff fields used by ratePlan; no basket or customer fields.
function periodPricingData(product,products){
 const fields=['id','price','weekPrice','monthPrice','rentalPricingMode','priceOnRequest','stylingContinuation','isPackage','servicePeriod'];
 const pick=p=>Object.fromEntries([...fields.filter(key=>p[key]!==undefined).map(key=>[key,p[key]]),...(p.components?.length?[['components',p.components.map(({id,quantity})=>({id,quantity}))]]:[])]);
 const seen=new Set(),members=[];
 const collect=p=>{for(const component of p.components||[]){if(seen.has(component.id))continue;seen.add(component.id);const child=products.find(item=>item.id===component.id);if(child){members.push(pick(child));collect(child);}}};
 collect(product);return {product:pick(product),products:members};
}
export function rentalPeriodPresentation(data,days){
 const p=data.product;
 if(data.kind==='row'){
  const plan=days===null?null:ratePlan(p,days,data.products);
  return {visible:!!plan,html:plan?'<span>Valgt leieperiode · '+days+' døgn</span><strong>'+priceMarkup(plan.total)+'</strong>':''};
 }
 const count=Math.ceil((days||1)/30),plan=ratePlan(p,days||1,data.products),unit=data.unit;
 const html=unit?'<strong>'+priceMarkup(p.price)+' per '+escapePeriod(unit)+' / påbegynte 30 dager · inkl. mva.</strong>'+(count>1?'<span>Valgt leieperiode: '+priceMarkup(plan.total)+' per '+escapePeriod(unit)+' · '+count+' perioder.</span>':''):'<strong>'+priceMarkup(plan.total)+' / pakke</strong><span>'+(count===1?'Inntil 30 dagers leie':days+' dagers leie · '+count+' perioder')+'</span>';
 return {visible:true,html};
}
const periodReady='<span data-rental-period-ready hidden></span>';
export function periodPriceMarkup(product,{days=null,products=[],unit='',kind='row'}={}){
 const data={kind,...periodPricingData(product,products),...(unit?{unit}:{})},view=rentalPeriodPresentation(data,days),tag=kind==='row'?'div':'p';
 return '<'+tag+' data-rental-period="'+escapePeriod(JSON.stringify(data))+'"'+(kind==='row'?(view.visible?' class="rental-period-price"':' hidden'):' class="cart-period-price"')+'>'+view.html+periodReady+'</'+tag+'>';
}
