import {readSavedRentalPeriod,rentalPeriodPresentation} from './rental-period-display.js?v=choicesfirst20261119';
import {detailSelectionPrices} from './detail-price-model.js?v=longrent20261026';
import {rentalSelectionSummaryMarkup} from './rental-selection-summary.js?v=choicesfirst20261119';

export function mountRentalPeriodFirstPaint(doc,storage,win=window){
 const state=readSavedRentalPeriod(storage);win.konseptInitialRentalPeriod=state;
 if(state.days===null)return {disconnect(){}};
 const projected=new WeakSet();
 const project=()=>{
  if(win.konseptRentalPeriodClientReady){observer.disconnect();return;}
  observer.disconnect();
  for(const node of doc.querySelectorAll('[data-rental-period]')){
   // The last hidden marker means the parser has delivered the complete body.
   if(projected.has(node)||!node.querySelector('[data-rental-period-ready]'))continue;
   projected.add(node);
   try{
    const data=JSON.parse(node.getAttribute('data-rental-period')),view=rentalPeriodPresentation(data,state.days);
    if(data.kind==='row'){node.className=view.visible?'rental-period-price':'';node.hidden=!view.visible;}
    node.innerHTML=view.html+'<span data-rental-period-ready hidden></span>';
   }catch{}
  }
  for(const node of doc.querySelectorAll('[data-initial-selection-price]')){
   if(projected.has(node)||!node.querySelector('[data-initial-selection-ready]'))continue;
   projected.add(node);
   try{
    const data=JSON.parse(node.getAttribute('data-initial-selection-price'));
    if(data.mode==='buy'||data.valid===false)continue;
    const quote=detailSelectionPrices(data.product,data.quantity,data.extras,data.products,state.days);
    const supplement=node.querySelector('.business-purchase-summary');
    node.innerHTML=rentalSelectionSummaryMarkup(quote,data.extras,{days:state.days,products:data.products,confirmed:data.confirmed})+'<span data-initial-selection-ready hidden></span>';
    if(supplement)node.append(supplement);
   }catch{}
  }
  if(doc.readyState==='loading')observer.observe(doc.documentElement,{childList:true,subtree:true});
 };
 const observer=new MutationObserver(project);
 doc.addEventListener('DOMContentLoaded',()=>{project();observer.disconnect();},{once:true});project();
 return {disconnect:()=>observer.disconnect()};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 let storage;try{storage=window.sessionStorage;}catch{}
 mountRentalPeriodFirstPaint(document,storage,window);
}
