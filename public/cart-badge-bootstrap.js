// Classic head script: restore only the displayed count before the header paints.
// The catalogue still validates the actual basket before it can be submitted.
(() => {
 function read(area,key){try{return JSON.parse(window[area].getItem(key)||'null');}catch{return null;}}
 function countBasket(value,{rental=false}={}){
  if(!value||typeof value!=='object'||Array.isArray(value))return 0;
  return Object.values(value).reduce((sum,value)=>{
   const quantity=rental&&typeof value==='string'?Number(value):value;
   return sum+(Number.isInteger(quantity)&&quantity>0&&quantity<=99?quantity:0);
  },0);
 }
 const custom=read('sessionStorage','konsept-custom-request-v1');
 const counts={
  count:countBasket(read('localStorage','konsept-cart-v1'),{rental:true})+(custom?.active===true&&typeof custom.text==='string'?1:0),
  saleCount:countBasket(read('localStorage','konsept-sale-cart-v1'))
 };
 let observer;
 function paint(){
  let badge;
  for(const [id,count] of Object.entries(counts)){
   const element=document.getElementById(id);
   if(!element)continue;
   badge=element;
   if(element.textContent!==String(count))element.textContent=String(count);
  }
  // Keep observing until the entire header has been parsed, including a count
  // whose opening/closing tags arrived in separate network chunks. Stop before
  // deferred application modules can validate and update the count themselves.
  if(badge?.closest('header')?.nextElementSibling)observer?.disconnect();
 }
 observer=new MutationObserver(paint);
 observer.observe(document.documentElement,{childList:true,subtree:true});
 paint();
 document.addEventListener('DOMContentLoaded',()=>observer.disconnect(),{once:true});
})();
