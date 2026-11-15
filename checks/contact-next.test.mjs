import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/customer-info.js',import.meta.url),'utf8');
const start=source.indexOf("  form.addEventListener('keydown',event=>{"),end=source.indexOf('\n  });',start)+6;
assert.ok(start>0&&end>start);
function fixture({mobile=true,selected=1,hidden=[],disabled=[],purchase=false}={}){
 let focused=null,listener;
 const field=(name,type='text',visible=true)=>({name,type,tagName:type==='select-one'?'SELECT':'INPUT',disabled:false,checked:false,getClientRects:()=>visible?[{}]:[],focus(){focused=this;}});
 const fields=[field('address'),field('postalCode'),field('postalCity'),field('notes','textarea')];fields[3].tagName='TEXTAREA';
 const transport=purchase?[field('shipping','select-one')]:Array.from({length:5},(_,i)=>Object.assign(field('delivery','radio',!hidden.includes(i)),{checked:i===selected,disabled:disabled.includes(i)}));
 const form={querySelectorAll:()=>transport,addEventListener:(name,fn)=>{assert.equal(name,'keydown');listener=fn;}};
 vm.runInNewContext(source.slice(start,end),{form,fields,matchMedia:()=>({matches:mobile})});
 return {fields,transport,get focused(){return focused;},enter(target=fields[2],extra={}){let prevented=false;listener({key:'Enter',target,preventDefault(){prevented=true;},...extra});return prevented;}};
}
test('mobile Next from postal city stops at the selected delivery choice, without changing selection',()=>{
 const ui=fixture();const checked=ui.transport.map(n=>n.checked);
 assert.equal(ui.enter(),true);assert.equal(ui.focused,ui.transport[1]);assert.deepEqual(ui.transport.map(n=>n.checked),checked);
 assert.notEqual(ui.focused,ui.fields[3]);
});
test('manual and included transport focus their visible enabled choice; unavailable radios are skipped',()=>{
 for(const option of [{selected:4,hidden:[0,1,2,3],disabled:[0,1,2,3]},{selected:1,hidden:[0,2,3,4]},{selected:2,disabled:[2]}]){
  const ui=fixture(option);ui.enter();assert.equal(ui.focused,option.disabled?.includes(option.selected)?ui.transport[0]:ui.transport[option.selected]);
 }
});
test('purchase goes to shipping; desktop Enter after postal city also stops at delivery',()=>{
 const purchase=fixture({purchase:true});purchase.enter();assert.equal(purchase.focused,purchase.transport[0]);
 const rental=fixture();rental.enter(rental.fields[0]);assert.equal(rental.focused,rental.fields[1]);
 const desktop=fixture({mobile:false});assert.equal(desktop.enter(),true);assert.equal(desktop.focused,desktop.transport[1]);
 const desktopAddress=fixture({mobile:false});assert.equal(desktopAddress.enter(desktopAddress.fields[0]),false);assert.equal(desktopAddress.focused,null);
 const composing=fixture();assert.equal(composing.enter(composing.fields[2],{isComposing:true}),false);assert.equal(composing.focused,null);
 assert.equal(fixture().enter({tagName:'TEXTAREA'}),false);
});
