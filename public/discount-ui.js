const money=n=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:2}).format(n);
// No code list is sent to the storefront. Every quote is priced and validated on the server.
export function mountDiscount(target,payload,{onChange=()=>{}}={}){
 if(!target)return {refresh:async()=>null,code:()=>'',state:()=>({code:'',pending:false,result:null}),lines:()=>[],clear(){}};
 target.innerHTML='<label for="couponInput">Rabattkode for boligstylingkunder</label><div class="coupon-entry"><input id="couponInput" maxlength="40" autocomplete="off" placeholder="Skriv inn kode"><button type="button" class="button button-outline" id="couponApply">Bruk kode</button><button type="button" class="text-button" id="couponRemove" hidden>Fjern</button></div><p id="couponStatus" role="status" aria-live="polite"></p><div id="couponTotals"></div>';
 const input=target.querySelector('input'),status=target.querySelector('#couponStatus'),totals=target.querySelector('#couponTotals'),remove=target.querySelector('#couponRemove');
 const storageKey='konsept-discount-code-'+(payload().mode==='buy'?'buy':'rent');
 let code='',result=null,version=0,key='',pending=null;
 try{const saved=sessionStorage.getItem(storageKey)||'';if(/^[A-Z0-9_-]{3,40}$/.test(saved))code=saved;}catch{}
 const currentKey=()=>JSON.stringify({...payload(),code});
 const state=()=>({code,pending:!!pending,result:code&&key===currentKey()?result:null});
 const changed=()=>onChange(state());
 // Store only the requested code, never a quote. renderCart refreshes it after loading the current catalog/basket.
 function remember(){try{if(/^[A-Z0-9_-]{3,40}$/.test(code))sessionStorage.setItem(storageKey,code);else sessionStorage.removeItem(storageKey);}catch{}}
 function clear(){version++;code='';result=null;key='';pending=null;remember();totals.replaceChildren();remove.hidden=true;status.textContent='';changed();}
 if(code){input.value=code;remove.hidden=false;status.textContent='Rabattkoden kontrolleres mot det gjeldende utvalget.';}
 async function refresh(force=false){
  if(!code)return null;const data={...payload(),code},next=JSON.stringify(data);
  if(!force&&next===key)return pending||result;
  key=next;const current=++version;result=null;totals.replaceChildren();status.textContent='Kontrollerer rabattkoden …';
  pending=(async()=>{
   // Publish the pending state before any response (including a synchronous fetch failure).
   await Promise.resolve();
   try{
    if(current!==version)return null;
    const response=await fetch('/api/discount/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:next}),body=await response.json();
    if(current!==version)return null;
    if(next!==currentKey())throw Error('Utvalget er endret. Kontroller rabattkoden på nytt.');
    if(!response.ok)throw Error(body.error||'Kunne ikke kontrollere rabattkoden.');
    result=body;status.textContent=body.code+' gir '+body.percent+' % rabatt på prisede '+(body.mode==='buy'?'produkter':'leieobjekter')+'.';totals.innerHTML='<div><span>Rabatt</span><strong>−'+money(body.discount)+'</strong></div><div class="estimate-total"><span>'+(body.hasUnpriced?'Delpris etter rabatt':'Sum etter rabatt')+'</span><strong>'+money(body.total)+'</strong></div><p class="hint">Inkl. mva. Transport, styling og andre tillegg er ikke med. Endelig tilbud bekreftes av oss.</p>';changed();return result;
   }catch(error){if(current===version){result=null;status.textContent=error.message;key='';changed();}return null;}
   finally{if(current===version){pending=null;changed();}}
  })();changed();return pending;
 }
 target.querySelector('#couponApply').onclick=()=>{clear();code=input.value.trim().toUpperCase();input.value=code;if(!code){status.textContent='Skriv inn en rabattkode.';return;}remember();remove.hidden=false;refresh(true);};
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();target.querySelector('#couponApply').click();}});
 input.addEventListener('input',()=>{if(code&&input.value.trim().toUpperCase()!==code)clear();});
 remove.onclick=()=>{clear();input.value='';input.focus();};
 return {refresh,clear(){clear();input.value='';},code:()=>code,state,lines(){const result=state().result;return result?['','RABATTKODE: '+result.code+' ('+result.percent+' %)','Prisede produkter før rabatt: '+money(result.subtotal),'Rabatt: −'+money(result.discount),(result.hasUnpriced?'Delpris':'Sum')+' etter rabatt: '+money(result.total)+' inkl. mva.','Transport, styling og andre tillegg avklares separat.']:code?['','Rabattkode ønsket: '+code+' – ikke validert, må avklares i tilbudet.']:[];}};
}
