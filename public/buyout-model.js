import {businessPurchaseEnabled,packagePurchasePrice} from './business-purchase-model.js';
import {addDateDays} from './rental-dates.js?v=launch20261024';
const defaults={obj_textile_loungestol_30days:600,obj_1cd92777d68c44ddbc1fe0f9dc72b032:1200,obj_4768bc953cba43da88eb565feb753892:900,obj_eaa2e64c15ce45cd8b3177f58f75b3ea:900};
const price=value=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;
const round=value=>Math.round(value*100)/100;
const money=value=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(value)+' kr';
export function addonBuyoutPrice(p){return p?Object.hasOwn(p,'buyoutUnitPrice')?price(p.buyoutUnitPrice):defaults[p.id]??null:null;}
export function isBuyoutAddon(p){return !!p&&(p.addonOnly||p.rentalPricingMode==='period')&&p.category!=='Styling'&&p.offeringType!=='service';}
export function packageBuyoutOption(p,products,{quantity=1,extras={},custom=false}={}){
 if(!businessPurchaseEnabled(p)||!Number.isInteger(quantity)||quantity<1)return null;
 const lines=[{id:p.id,name:p.name,quantity,unitPrice:custom?null:packagePurchasePrice(p),total:custom?null:packagePurchasePrice(p,quantity)}];
 for(const [id,q] of Object.entries(extras)){
  const extra=products.find(x=>x.id===id);if(!isBuyoutAddon(extra)||!Number.isInteger(q)||q<1)continue;
  const unitPrice=addonBuyoutPrice(extra);lines.push({id,name:extra.name,quantity:q,unitPrice,total:unitPrice===null?null:round(unitPrice*q)});
 }
 return {id:p.id,name:p.name,quantity,custom,lines,total:lines.some(l=>l.total===null)?null:round(lines.reduce((n,l)=>n+l.total,0))};
}
// This is separate from the rental total. Never assume that a request is paid.
export function buyoutFacts(options,{end='',returnCredit=null}={}){
 if(!options.length)return [];
 const total=options.some(o=>o.total===null)?null:round(options.reduce((n,o)=>n+o.total,0));
 const facts=[['Valgfritt kjøp etter leieperioden','Du velger selv om du vil kjøpe eller returnere. Kjøp er ikke inkludert i leiesummen.\n'+options.flatMap(o=>o.lines.map(l=>l.quantity+' × '+l.name+': '+(l.total===null?'Pris avklares i tilbudet':money(l.total)+(l.quantity>1?' ('+money(l.unitPrice)+' per sett)':'')))).join('\n')+'\nValgte tekstil- og dekorpakker følger med ved kjøp og er inkludert i kjøpsprisen.'],['Samlet valgfri kjøpspris inkl. mva.',total===null?'Avklares i tilbudet før leieperioden starter.':money(total)]];
 if(returnCredit===null)facts.push(['Returtransport ved kjøp','Eventuelt fratrekk avklares i tilbudet. Bare forhåndsbetalt henting som faktisk bortfaller, trekkes fra.']);
 else if(returnCredit>0){
  facts.push(['Fratrekk for forhåndsbetalt henting',money(returnCredit)+' dersom hentingen er betalt og bortfaller ved kjøpet.']);
  if(total!==null)facts.push(['Beløp ved kjøp etter eventuelt fratrekk',money(round(Math.max(0,total-returnCredit)))+' hvis hentingen er forhåndsbetalt og bortfaller.']);
 }
 const deadline=addDateDays(end,-2),format=d=>d.replace(/(\d{4})-(\d{2})-(\d{2})/,'$3.$2.$1');
 facts.push(['Svarfrist for kjøp','Gi beskjed minst 2 dager før avtalt returdato.'+(deadline?' Med ønsket returdato '+format(end)+' er fristen '+format(deadline)+'. Endres returdatoen, endres fristen tilsvarende.':'')]);
 facts.push(['Leie og retur','Betalt leie og utført levering trekkes ikke fra kjøpsprisen. Hvis du ikke velger kjøp innen fristen, gjelder avtalt retur.']);
 return facts;
}
