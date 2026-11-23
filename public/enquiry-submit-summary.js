import {receiptTotalLabel} from './receipt-layout.js?v=transportreceipt20261122';

const amount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const round=value=>Math.round(value*100)/100;
const money=value=>(value<0?'−':'')+new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(Math.abs(value))+' kr';

// The caller supplies current basket/date prices. This summary never creates a
// tariff, adds an optional buyout, or reuses an earlier discount/route quote.
export function submitSummaryModel({mode='rental',hasItems=false,needsDates=false,datesReady=false,subtotal=null,hasUnpriced=false,discount=null,delivery={},stylist=false}={}){
 const acquisition=['rental','purchase','mixed'].includes(mode)?mode:'rental';
 const missingDates=needsDates&&!datesReady,gross=amount(subtotal),pending=!!discount?.code&&!!discount.pending;
 const result=discount?.code&&!pending?discount.result:null;
 const reduction=amount(result?.discount),quoteSubtotal=amount(result?.subtotal),quoteTotal=amount(result?.total);
 const validDiscount=!!result&&gross!==null&&reduction!==null&&quoteSubtotal!==null&&quoteTotal!==null&&quoteSubtotal<=gross+.005&&reduction<=quoteSubtotal+.005&&Math.abs(round(quoteSubtotal-reduction)-quoteTotal)<.005;
 const unknownPrices=!!hasUnpriced||!!(validDiscount&&result.hasUnpriced);
 const transport=delivery.included===true?0:amount(delivery.total);
 const rows=[],partial=missingDates||unknownPrices;
 const goodsLabel=acquisition==='purchase'?'Kjøp':acquisition==='mixed'?'Leie og kjøp':'Leie';
 if(gross!==null&&(gross>0||!partial))rows.push({label:partial?'Delpris for prisede varer':goodsLabel,value:gross});
 if(missingDates)rows.push({label:'Leieperiode',value:'Velg datoer'});
 if(validDiscount)rows.push({label:'Rabatt · '+discount.code,value:-reduction});
 const statuses={address:'Fyll inn adresse for å se pris',calculating:'Beregner transportpris …',manual:'Prises i tilbudet',dates:'Velg leieperiode for å se pris'};
 rows.push({label:'Transport',value:delivery.included===true?'Inkludert':transport===null?(statuses[delivery.status]||'Avklares i tilbudet'):transport,...(transport===null&&delivery.status==='address'?{addressField:delivery.addressField}:{})});
 const showGoodsTotal=transport===null&&acquisition!=='purchase'&&gross!==null&&!partial&&!pending;
 const pendingTotal=showGoodsTotal?money(round(gross-(validDiscount?reduction:0)))+' + transport':'Avklares i tilbudet';
 const total=gross===null||missingDates||unknownPrices||transport===null||pending?null:round(gross-(validDiscount?reduction:0)+transport);
 const label=acquisition==='rental'?'Totalpris':receiptTotalLabel({acquisition,delivery:{total:transport,label:delivery.included===true?'Transport inkludert':delivery.label||''}});
 const notes=['Alle priser er inkl. mva. Forespørselen er uforpliktende.'];
 if(acquisition==='rental'){
  if(gross!==null&&!partial&&!pending)notes.push('Beregnet leie er '+money(round(gross-(validDiscount?reduction:0)))+(validDiscount?' etter rabatt':'')+'.');
  notes.push('Endelig totalpris inkludert eventuell transport bekreftes i tilbudet.');
 }
 if(missingDates)notes.push('Velg leieperiode for å beregne samlet pris.');
 if(unknownPrices)notes.push('Varer med pris på forespørsel avklares i tilbudet.');
 if(pending)notes.push('Rabattkoden kontrolleres.');
 else if(discount?.code&&!validDiscount)notes.push('Rabatt er ikke trukket fra; koden må avklares.');
 if(stylist)notes.push('Styling er ikke inkludert og prises separat i tilbudet.');
 return {hidden:!hasItems,rows,label,total,pendingTotal,note:notes.join(' ')};
}

const mounted=new WeakMap();
export function mountSubmitSummary(form){
 if(form&&mounted.has(form))return mounted.get(form);
 const button=form?.querySelector('[type="submit"]')||form?.querySelector('button:not([type])');
 if(!button)return {update:submitSummaryModel};
 const doc=form.ownerDocument||document,section=doc.createElement('section');
 section.className='enquiry-submit-summary';section.hidden=true;
 section.setAttribute('aria-label','Prisoppsummering');section.setAttribute('aria-live','polite');
 button.parentNode.insertBefore(section,button);
 function row(label,value,total=false,fixed='',addressField){
  const line=doc.createElement('div'),name=doc.createElement('span'),price=doc.createElement('span');
  line.className=total?'enquiry-submit-summary-total':'enquiry-submit-summary-row';
  price.className='enquiry-submit-summary-value';name.textContent=label;
  if(typeof value==='number'){price.setAttribute('data-price-gross',String(value));if(fixed)price.setAttribute('data-price-fixed',fixed);}
  price.textContent=typeof value==='number'?money(value):value;
  if(addressField){
   const link=doc.createElement('button');
   link.type='button';link.className='text-button';link.textContent=value;
   link.addEventListener('click',()=>{
    const field=form.elements.namedItem(addressField);
    field?.focus({preventScroll:true});field?.scrollIntoView({block:'center'});
   });
   price.replaceChildren(link);
  }
  line.append(name,price);return line;
 }
 const api={update(state){
  const model=submitSummaryModel(state);section.hidden=model.hidden;section.replaceChildren();
  if(!model.hidden){
   for(const item of model.rows)section.append(row(item.label,item.value,false,'',item.addressField));
   if(model.total!==null){for(const [label,fixed] of [['Sum ekskl. mva.','net'],['Mva. (25 %)','vat']]){const line=row(label,model.total,false,fixed);line.setAttribute('data-price-detail','');section.append(line);}}
   section.append(row(model.label+' inkl. mva.',model.total??model.pendingTotal,true,'gross'));
   const note=doc.createElement('p');note.className='enquiry-submit-summary-note';note.textContent=model.note.replace(/Beregnet leie er [^.]+\. /,'').replace('Alle priser er inkl. mva.','Vare- og transportlinjer vises inkl. mva. Totalprisen er alltid inkludert merverdiavgift.');section.append(note);
  }
  return model;
 }};
 mounted.set(form,api);return api;
}
