import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/request-route-bootstrap.js',import.meta.url),'utf8');
function route(path,basket={},saved=null){
 const values=new Map(saved?[['konsept-custom-request-v1',JSON.stringify(saved)]]:[]),redirects=[];
 vm.runInNewContext(source,{URL,location:{href:'https://example.test'+path,replace:url=>redirects.push(url)},localStorage:{getItem:key=>JSON.stringify(key==='konsept-cart-v1'?basket:[])},sessionStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}});
 return {redirects,custom:JSON.parse(values.get('konsept-custom-request-v1')||'null')};
}
test('asking for a proposal with products opens an active custom request and preserves its text',()=>{
 assert.deepEqual(route('/tilpasset-foresporsel.html',{chair:1},{active:false,text:'Et bord som passer til stolen'}),{redirects:['/foresporsel.html'],custom:{active:true,text:'Et bord som passer til stolen'}});
 assert.equal(route('/tilpasset-foresporsel.html',{chair:1}).custom.active,true);
});
test('ordinary cart and purchase routes do not activate a custom request; empty proposal stays separate',()=>{
 for(const path of ['/foresporsel.html','/foresporsel.html?type=kjop'])assert.deepEqual(route(path,{chair:1}),{redirects:[],custom:null});
 assert.deepEqual(route('/tilpasset-foresporsel.html'),{redirects:[],custom:null});
});
test('every rental template retains one explicitly form-associated custom textarea before the products',async()=>{
 for(const name of ['index','utvalg','anledning','leieprodukt']){
  const html=await readFile(new URL('../public/'+name+'.html',import.meta.url),'utf8');
  assert.equal((html.match(/id="customRequestText"/g)||[]).length,1);
  assert.match(html,/<textarea id="customRequestText" name="customRequest" form="requestForm"/);
  assert.ok(html.indexOf('id="customRequestItem"')<html.indexOf('id="cartItems"'));
  assert.ok(html.indexOf('id="cartItems"')<html.indexOf('<form id="requestForm"'));
 }
});
