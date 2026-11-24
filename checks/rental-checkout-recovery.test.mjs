import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const script=await readFile(new URL('../public/rental-checkout-recovery.js',import.meta.url),'utf8');
function checkout(query=''){
 const handlers={},redirects=[],retry={hidden:true},status={textContent:'Gjør forespørselen klar …'};
 let timeout,loading=true;
 const context={
  URL,location:{pathname:'/foresporsel.html',href:'https://example.org/foresporsel.html'+query,replace:url=>redirects.push(url)},
  window:{addEventListener:(event,fn)=>handlers[event]=fn},
  document:{hidden:false,addEventListener:(event,fn)=>handlers[event]=fn,getElementById:()=>loading?{querySelector:key=>key==='[data-retry-cart]'?retry:status}:null},
  clearTimeout:()=>{},setTimeout:fn=>{timeout=fn;}
 };
 vm.runInNewContext(script,context);
 return {handlers,redirects,retry,status,ready:()=>{loading=false;},expire:()=>{handlers.pageshow();timeout();}};
}
test('a stalled cart retries once, preserves its query and offers a manual retry after a second failure',()=>{
 const first=checkout('?bruk=boligsalg');first.expire();assert.match(first.redirects[0],/bruk=boligsalg&kurvforsok=1$/);
 const second=checkout('?kurvforsok=1');second.expire();assert.deepEqual(second.redirects,[]);assert.equal(second.retry.hidden,false);
});
test('a failed module retries immediately; a ready cart survives the pageshow watchdog',()=>{
 const cart=checkout();cart.handlers.error({target:{tagName:'SCRIPT',src:'/rental-enquiry.bundle.js?v=x'}});assert.equal(cart.redirects.length,1);
 const ready=checkout();ready.ready();ready.expire();assert.deepEqual(ready.redirects,[]);
});
