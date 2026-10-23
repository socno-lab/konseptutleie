import {rentalEstimate,normalizeBasket,planText} from '../public/catalog-model.js';
import {rentalRateSets,scopeForOccasion} from '../public/rental-pricing-model.js';
import {saleEstimate,saleModuleError} from '../public/sales-model.js';
import {businessPurchaseEnabled,resolvedPackagePurchasePrice} from '../public/business-purchase-model.js';
import {packageCartView} from '../public/package-cart-model.js';
import {rentalDeliveryCapacity} from '../public/delivery-model.js';
import {addonRequirementError} from '../public/addon-model.js';
import {discountQuote} from './discounts.mjs';
import {validSaleSetup,saleSetupBasket} from '../public/sale-sofa-model.js';
const fail=message=>{throw Object.assign(Error(message),{status:400});};
const date=(value,label)=>{if(!value)return '';if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail('Kontroller '+label+'.');return value;};
export function requestDetails(input){
 const d=input.details;if(!d||typeof d!=='object'||Array.isArray(d))fail('Last inn siden på nytt før du sender forespørselen.');
 const text=(key,max=300)=>{const v=d[key]??'';if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))fail('Kontroller '+key+'.');return v.trim();};
 return {phone:text('phone',40),company:text('company',150),address:text('address',300),comment:text('notes',3000),occasion:text('occasion',100),delivery:text('delivery',100),start:date(d.start,'fra-dato'),end:date(d.end,'til-dato'),customText:text('customRequest',3000),stylingNotes:text('stylingNotes',2000),stylist:d.stylist==='yes',discountCode:text('discountCode',40),deliveryToken:text('deliveryToken',6000)};
}
export function createEnquirySnapshot(value,input,products,{codes=[],verifyDelivery=()=>null}={}){
 const d=requestDetails(input),rental=value.kind==='rental',choices=input.businessChoices||{};
 if(!d.phone||!/[0-9]/.test(d.phone))fail('Oppgi telefonnummer.');
 if(!/^.{3,},?\s+[0-9]{4}\b[\s,]+\S.{1,}$/u.test(d.address))fail('Oppgi gateadresse, postnummer og poststed.');
 if(rental&&!d.occasion)fail('Velg anledning.');
 if(!choices||typeof choices!=='object'||Array.isArray(choices)||Object.keys(choices).length>150)fail('Kontroller kjøpsvalg.');
 const rent={},buy={};for(const [id,q] of Object.entries(input.basket)){
  const p=products.find(x=>x.id===id),mode=choices[id];
  if(mode&&!['rent','buy','try'].includes(mode)||mode&&!businessPurchaseEnabled(p))fail('Kontroller kjøpsvalg.');
  (rental&&mode==='buy'?buy:rent)[id]=q;
 }
 const scope=scopeForOccasion(d.occasion),priced=products.map(p=>({...p,...rentalRateSets(p,products)[scope]}));
 if(rental){
  const normalized=normalizeBasket(rent,priced);
  if(Object.keys(rent).some(id=>rent[id]!==normalized[id]))fail('Beholdningen eller tilvalgene er endret. Kontroller utvalget.');
  const addonError=addonRequirementError(rent,priced);if(addonError)fail(addonError);
  if((Object.keys(rent).length||value.customRequest)&&(!d.start||!d.end))fail('Velg ønsket leieperiode.');
  if(d.start&&d.end&&(d.end<d.start||Date.parse(d.end)-Date.parse(d.start)>365*86400000))fail('Leieperioden må være mellom ett døgn og ett år.');
 }
 if(input.packageGroups&&(!Array.isArray(input.packageGroups)||input.packageGroups.length>100)||input.cartLinks&&(typeof input.cartLinks!=='object'||Array.isArray(input.cartLinks)||Object.keys(input.cartLinks).length>150))fail('Kontroller pakker og tilvalg.');
 const groups=packageCartView(rent,priced,input.packageGroups||[],input.cartLinks||{}).groups;
 const quoteOnly=groups.some(g=>g.custom&&g.product?.packageCustomPricing==='quote');
 const quote=rental?rentalEstimate(rent,priced,d.start,d.end):saleEstimate(input.basket,products);
 if(!rental){const err=saleModuleError(input.basket,products);if(err)fail(err);}
 const lines=(rental?quote.lines.map(l=>{const p=priced.find(x=>x.id===l.id);return {id:l.id,name:l.name,quantity:l.quantity,basis:l.plan?new Intl.NumberFormat('nb-NO').format(l.plan.total)+' kr per stk. · '+planText(l.plan):'Leie · pris avklares',total:l.plan?Math.round(l.plan.total*l.quantity*100)/100:null,contents:p.isPackage?(p.components||[]).map(c=>c.quantity+' × '+(products.find(x=>x.id===c.id)?.name||'Produkt')):[]};}):quote.lines.map(l=>({...l,basis:l.unitPrice===null?'Kjøp · pris avklares':new Intl.NumberFormat('nb-NO').format(l.unitPrice)+' kr per stk.'}))).map(l=>({...l,...(rental&&quoteOnly?{total:null,basis:'Tilpasset innhold · pris avklares'}:{})}));
 for(const [id,q] of Object.entries(buy)){const p=products.find(x=>x.id===id),unit=resolvedPackagePurchasePrice(p,products);lines.push({id,name:p.name,quantity:q,basis:'Kjøpsønske · fast pakkeinnhold',total:unit===null?null:Math.round(unit*q*100)/100,contents:(p.components||[]).map(c=>c.quantity+' × '+products.find(x=>x.id===c.id)?.name)});}
 if(value.customRequest){if(!d.customText)fail('Beskriv den tilpassede forespørselen.');lines.push({id:'custom',name:'Tilpasset forespørsel',quantity:1,basis:d.customText,total:null});}
 // Store only catalog-verified relationships; prices and quantities stay unchanged.
 for(const line of lines){
  const linked=input.cartLinks?.[line.id]?.parentId;
  const eligible=lines.filter(parent=>parent.id!==line.id&&products.find(p=>p.id===parent.id)?.relatedAddOns?.includes(line.id));
  const parents=eligible.some(p=>p.id===linked)?eligible.filter(p=>p.id===linked):eligible;
  if(parents.length)line.addonFor=parents.map(p=>({id:p.id,name:p.name}));
 }
 const facts=[];
 if(!rental&&input.purchaseSofas!==undefined){const setups=input.purchaseSofas;if(!Array.isArray(setups)||setups.length>50||setups.some(s=>!validSaleSetup(s,products))||new Set(setups.map(s=>s.id)).size!==setups.length)fail('Kontroller sofaoppsettene.');if(Object.entries(saleSetupBasket(setups)).some(([id,q])=>q>(input.basket[id]||0)))fail('Kontroller modulene i handlekurven.');for(const [i,s] of setups.entries())facts.push(['Sofa '+(i+1)+' · '+s.series,Object.entries(s.selection).map(([id,q])=>q+' × '+products.find(p=>p.id===id).name).join(' · ')]);}
 if(rental&&d.start&&d.end)facts.push(['Ønsket leieperiode',d.start+' til '+d.end]);
 if(d.occasion)facts.push(['Bruksområde',d.occasion]);if(!rental||Object.keys(buy).length)facts.push(['Leveringstid','2–3 uker. Levering kan skje tidligere. Vi bekrefter leveringsdatoen i ordrebekreftelsen.']);
 if(d.stylist)facts.push(['Styling ønskes',d.stylingNotes||'Stylist – pris avklares i tilbudet']);
 for(const g of groups.filter(g=>g.custom))facts.push(['Tilpasset fra '+g.name,Object.entries(g.selection).map(([id,q])=>q+' × '+products.find(x=>x.id===id)?.name).join('; ')]);
 for(const [id,mode] of Object.entries(choices))if(mode==='try')facts.push(['Leie med kjøpsmulighet',products.find(x=>x.id===id)?.name+' – kjøpspris avtales separat']);
 // Preserve optional textile/colour wishes, never prices or arbitrary HTML.
 for(const [id,link] of Object.entries(input.cartLinks||{}))if(input.basket[id]&&Array.isArray(link?.choices)){
  // Decor is already a priced product line; its standard stylist text is not a customer wish.
  if(/^dekorpakke\b/i.test(products.find(p=>p.id===id)?.name||''))continue;
  const wishes=link.choices.slice(0,30).filter(c=>Number.isInteger(c.quantity)&&c.quantity>0&&c.quantity<=input.basket[id]&&typeof c.color==='string'&&c.color.length<=150&&(!c.duvets||typeof c.duvets==='string'&&c.duvets.length<=150)).map(c=>c.quantity+' sett: '+c.color+(c.duvets?' · '+c.duvets:''));
  if(wishes.length)facts.push(['Ønsker til '+products.find(p=>p.id===id).name,wishes.join('; ')]);
 }
 let discount=null;
 if(d.discountCode&&!quoteOnly&&Object.keys(rent).length){try{discount=discountQuote({mode:rental?'rent':'buy',code:d.discountCode,basket:rental?rent:input.basket,start:d.start,end:d.end,scope},products,codes);}catch{facts.push(['Ønsket rabattkode',d.discountCode+' – må avklares i tilbudet']);}}
 const capacity=rental?rentalDeliveryCapacity(rent,products,value.customRequest):{manual:false};
 const included=rental&&capacity.includedOnly;
 const self=!capacity.manual&&(rental?d.delivery==='Henter og returnerer selv':d.delivery==='Henter selv etter avtale');
 const labels=rental?['Henter og returnerer selv','Ønsker levering og henting','Kun levering – jeg returnerer selv','Kun henting – jeg henter selv','Avklares senere']:['Ønsker levering','Henter selv etter avtale'];
 if(!labels.includes(d.delivery))fail('Velg levering eller henting.');
 const visits=d.delivery==='Ønsker levering og henting'?2:1;
 const receipt=rental&&!self&&!capacity.manual?verifyDelivery(d.deliveryToken,d.address,rent,value.customRequest,visits):null;
 const delivery={label:included?'Levering og henting inkludert i fastprisen':capacity.manual||d.delivery==='Avklares senere'?'Transport avklares i tilbudet':d.delivery,total:included||self?0:receipt?.total??null};
 if(!self&&!capacity.manual&&d.delivery!=='Avklares senere'&&(!d.address||!/[0-9]{4}/.test(d.address)))fail('Oppgi komplett leveringsadresse med postnummer.');
 if(rental&&Object.keys(rent).some(id=>products.find(p=>p.id===id)?.deliveryIncluded))facts.push(['Inkludert transport','Levering og henting av juletreet er inkludert. Eventuell transportpris gjelder øvrige produkter.']);
 if(self&&!included)facts.push(['Henting',rental?'Segelckes vei 15, 2010 Strømmen. Tidspunkt avtales.':'Hentested og tidspunkt avtales.']);
 const hasUnpriced=lines.some(l=>l.total===null),subtotal=Math.round(lines.reduce((sum,l)=>sum+(l.total||0),0)*100)/100;
 const total=hasUnpriced||delivery.total===null?null:Math.round((subtotal-(discount?.discount||0)+delivery.total)*100)/100;
 for(const line of lines){const image=products.find(p=>p.id===line.id)?.image;if(typeof image==='string'&&/^\/(?:assets\/|media\/)/.test(image)&&!image.includes('..'))line.image=image;}
 return {id:value.id,kind:value.kind,name:value.name,email:value.email,terms:value.terms,receivedAt:new Date().toISOString(),phone:d.phone,company:d.company,address:d.address,comment:d.comment,facts,lines,delivery,discount,total,vatIncluded:true};
}
