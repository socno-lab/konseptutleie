import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {priceDisplayScript} from '../server/price-display-script.mjs';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {formatPrice,priceDisplayKey,priceDefaultKey} from '../public/price-display-model.js';
import {pricePickerContent} from '../public/price-display-markup.js';
import {catalogUsageMarkup} from '../public/catalog-usage-markup.js';

const source=await priceDisplayScript();
const storage=(values={})=>{const data=new Map(Object.entries(values));return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};};

// A small DOM tree, not a browser mock of the price algorithm. Mutation records
// are delivered explicitly so each assertion represents a possible parser yield.
function browser({local={},session={},url='https://konseptuell.no/utvalg.html',blockedLocal=false,blockedSession=false}={}){
 let document,created=0;
 const listeners=new Map(),windowListeners=new Map(),observers=[];
 const descendants=node=>node.childNodes.flatMap(child=>child.nodeType===1?[child,...descendants(child)]:[]);
 const matches=(node,selector)=>selector.split(',').some(part=>{
  part=part.trim();if(!part||node?.nodeType!==1)return false;
  if(part.includes('>')){const split=part.lastIndexOf('>');return matches(node,part.slice(split+1))&&matches(node.parentElement,part.slice(0,split));}
  const pieces=part.split(/\s+/);if(pieces.length>1){const last=pieces.pop();let parent=node.parentElement;if(!matches(node,last))return false;while(parent){if(matches(parent,pieces.join(' ')))return true;parent=parent.parentElement;}return false;}
  const tag=part.match(/^[a-z][a-z0-9-]*/i)?.[0];if(tag&&node.tagName!==tag.toUpperCase())return false;
  const id=part.match(/#([\w-]+)/)?.[1];if(id&&node.id!==id)return false;
  for(const m of part.matchAll(/\.([\w-]+)/g))if(!node.className.split(/\s+/).includes(m[1]))return false;
  for(const m of part.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)){const actual=node.getAttribute(m[1]);if(actual===null||m[2]!==undefined&&actual!==m[2])return false;}
  return true;
 });
 class Text{
  constructor(data){this.nodeType=3;this.data=String(data);this.parentElement=null;}
  get textContent(){return this.data;}set textContent(value){this.data=String(value);}
 }
 class Element{
  constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.childNodes=[];this.parentElement=null;this.dataset={};this.attributes={};this.className='';this.id='';this.ownerDocument=document;this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');}};}
  append(...nodes){for(let node of nodes){if(typeof node==='string')node=new Text(node);if(node.parentElement)node.parentElement.childNodes.splice(node.parentElement.childNodes.indexOf(node),1);node.parentElement=this;this.childNodes.push(node);}}
  before(node){const parent=this.parentElement;if(!parent)return;node.parentElement=parent;parent.childNodes.splice(parent.childNodes.indexOf(this),0,node);}
  setAttribute(name,value){value=String(value);this.attributes[name]=value;if(name==='id')this.id=value;if(name==='class')this.className=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
  getAttribute(name){if(name==='id')return this.id||null;if(name==='class')return this.className||null;if(name.startsWith('data-'))return this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??null;return this.attributes[name]??null;}
  get textContent(){return this.childNodes.map(n=>n.textContent).join('');}set textContent(value){this.childNodes=[];this.append(String(value));}
  set innerHTML(value){this.childNodes=[];const stack=[this];for(const token of value.match(/<[^>]+>|[^<]+/g)||[]){if(token.startsWith('</')){stack.pop();continue;}if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const node=new Element(tag);for(const attr of token.matchAll(/([\w-]+)="([^"]*)"/g))node.setAttribute(attr[1],attr[2]);stack.at(-1).append(node);if(!/\/>$/.test(token)&&!['input','br'].includes(tag))stack.push(node);}else stack.at(-1).append(token);}}
  matches(selector){return matches(this,selector);}
  closest(selector){let node=this;while(node){if(matches(node,selector))return node;node=node.parentElement;}return null;}
  querySelectorAll(selector){if(selector.startsWith(':scope > '))return this.childNodes.filter(n=>matches(n,selector.slice(9)));return descendants(this).filter(n=>matches(n,selector));}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 }
 const addListener=(map,name,handler)=>map.set(name,[...(map.get(name)||[]),handler]);
 document={readyState:'loading',body:null,addEventListener:(name,handler)=>addListener(listeners,name,handler),createElement:tag=>{created++;return new Element(tag);},getElementById:id=>document.querySelector('#'+id),querySelectorAll:selector=>document.documentElement.querySelectorAll(selector),querySelector:selector=>document.querySelectorAll(selector)[0]??null,createTreeWalker(root){const nodes=[];const walk=node=>{for(const child of node.childNodes){if(child.nodeType===3)nodes.push(child);else walk(child);}};walk(root);let index=0;return {nextNode:()=>nodes[index++]??null};}};
 document.documentElement=new Element('html');document.head=new Element('head');document.documentElement.append(document.head);
 const window={addEventListener:(name,handler)=>addListener(windowListeners,name,handler)};
 const localStore=storage(local),sessionStore=storage(session);
 Object.defineProperty(window,'localStorage',{get(){if(blockedLocal)throw Error('storage denied');return localStore;}});
 Object.defineProperty(window,'sessionStorage',{get(){if(blockedSession)throw Error('storage denied');return sessionStore;}});
 class MutationObserver{constructor(callback){this.callback=callback;this.active=false;observers.push(this);}observe(target,options){assert.ok(target,'observer must work before body exists');this.target=target;this.options=options;this.active=true;}disconnect(){this.active=false;}takeRecords(){return [];}}
 const context=vm.createContext({document,window,location:{href:url},URL,Intl,MutationObserver,NodeFilter:{SHOW_TEXT:4},Node:{ELEMENT_NODE:1,TEXT_NODE:3},console});
 const element=(tag,attrs={},text)=>{const node=new Element(tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.append(text);return node;};
 const dispatch=(name,event={})=>{for(const handler of listeners.get(name)||[])handler(event);};
 return {document,window,listeners,windowListeners,observers,localStore,sessionStore,element,get created(){return created;},run(){vm.runInContext(source,context);},body(...nodes){const body=element('body');body.append(...nodes);document.body=body;document.documentElement.append(body);this.flush([{type:'childList',target:document.documentElement,addedNodes:[body]}]);return body;},flush(records=[]){for(const observer of observers.filter(o=>o.active))observer.callback(records,observer);},ready(){document.readyState='interactive';dispatch('DOMContentLoaded');},click(mode,target=element('button',{'data-price-mode':mode})){dispatch('click',{target});},context(detail){dispatch('rental-price-display-context',{detail});}};
}

test('generated VAT runtime is standalone, checked in, and loaded synchronously before body',async()=>{
 assert.equal(await readFile(new URL('../public/price-display-first.js',import.meta.url),'utf8'),source);
 assert.doesNotMatch(source,/^\s*(?:import|export)\s/m);
 for(const name of ['index.html','utvalg.html','kjop.html','leieprodukt.html','kjopsprodukt.html']){
  const html=await readHtmlTemplate(name),scripts=[...html.matchAll(/<script\b[^>]*src="\/price-display-first\.js\?[^"<]+"[^>]*><\/script>/g)];
  assert.equal(scripts.length,1,name);assert.doesNotMatch(scripts[0][0],/\b(?:type|async|defer)=?|type="module"/);
  assert.ok(scripts[0].index<html.indexOf('<body'),name);assert.doesNotMatch(html,/src="\/price-display\.js/);
 }
});

test('saved excl preference converts parser-added prices before DOMContentLoaded without changing gross data or customer fields',()=>{
 const b=browser({local:{[priceDisplayKey]:'excl'}});b.run();assert.equal(b.document.body,null);assert.equal(b.document.documentElement.dataset.priceMode,'excl');assert.equal(b.observers.length,1);assert.equal(b.observers[0].target,b.document.documentElement);
 const price=b.element('span',{'data-price-gross':'3949'},formatPrice(3949));
 const gross=b.element('span',{'data-price-gross':'3949','data-price-fixed':'gross'},'original');
 const net=b.element('span',{'data-price-gross':'3949','data-price-fixed':'net'},'original');
 const vat=b.element('span',{'data-price-gross':'3949','data-price-fixed':'vat'},'original');
 const caption=b.element('p',{class:'rate-caption'},'Leiepriser inkl. mva.');
 const input=b.element('input');input.value='Kundens tekst inkl. mva.';
 const textarea=b.element('textarea',{},'Kundens melding inkl. mva.');caption.append(input,textarea);
 const name=b.element('h3',{},'Produktnavn inkl. mva.'),script=b.element('script',{},'{"price":3949,"label":"inkl. mva."}');
 b.body(price,gross,net,vat,caption,name,script);
 assert.equal(price.textContent,formatPrice(3159.2));assert.equal(price.dataset.priceGross,'3949');assert.equal(gross.textContent,formatPrice(3949));assert.equal(net.textContent,formatPrice(3159.2));assert.equal(vat.textContent,formatPrice(789.8));
 assert.equal(caption.childNodes[0].data,'Leiepriser ekskl. mva.');assert.equal(input.value,'Kundens tekst inkl. mva.');assert.equal(textarea.textContent,'Kundens melding inkl. mva.');assert.equal(name.textContent,'Produktnavn inkl. mva.');assert.equal(script.textContent,'{"price":3949,"label":"inkl. mva."}');
 assert.equal(b.document.readyState,'loading');assert.equal(b.created,0,'do not insert controls into partially parsed hosts');
});

test('explicit incl wins over business defaults before first content appears',()=>{
 const b=browser({url:'https://konseptuell.no/utvalg.html?bruk=messe',local:{[priceDisplayKey]:'incl'}});b.run();const price=b.element('span',{'data-price-gross':'400'},formatPrice(400));b.body(price);assert.equal(b.document.documentElement.dataset.priceMode,'incl');assert.equal(price.textContent,formatPrice(400));assert.equal(b.localStore.getItem(priceDefaultKey),'excl');
 b.context({purpose:'bedrift'});assert.equal(price.textContent,formatPrice(400));
});

test('early mode resolution keeps session fallback and handles storage denied entirely',()=>{
 const fallback=browser({blockedLocal:true,session:{[priceDisplayKey]:'excl'}});fallback.run();assert.equal(fallback.document.documentElement.dataset.priceMode,'excl');
 const denied=browser({blockedLocal:true,blockedSession:true,url:'https://konseptuell.no/utvalg.html?bruk=bedrift'});assert.doesNotThrow(()=>denied.run());assert.equal(denied.document.documentElement.dataset.priceMode,'excl');
 const privateUse=browser({blockedLocal:true,blockedSession:true});assert.doesNotThrow(()=>privateUse.run());assert.equal(privateUse.document.documentElement.dataset.priceMode,'incl');
});

test('one controller retains original captions across parsing, readiness and repeated VAT changes',()=>{
 const b=browser({local:{[priceDisplayKey]:'excl'}});b.run();const price=b.element('span',{'data-price-gross':'400'},formatPrice(400)),caption=b.element('p',{class:'rate-caption'},'Leiepriser inkl. mva.'),host=b.element('div',{id:'catalogUsage'});b.body(price,caption,host);
 assert.equal(caption.textContent,'Leiepriser ekskl. mva.');assert.equal(host.childNodes.length,0);
 b.ready();assert.equal(b.observers.length,1);assert.equal(b.listeners.get('click').length,1);assert.equal(b.listeners.get('rental-price-display-context').length,1);assert.equal(b.windowListeners.get('storage').length,1);assert.equal(host.querySelectorAll('.price-display-picker').length,1);
 for(const mode of ['incl','excl','incl']){b.click(mode);assert.equal(caption.textContent,mode==='incl'?'Leiepriser inkl. mva.':'Leiepriser ekskl. mva.');assert.equal(price.textContent,formatPrice(mode==='incl'?400:320));assert.equal(price.dataset.priceGross,'400');assert.equal(host.querySelectorAll('.price-display-picker').length,1);}
});

test('server-rendered VAT buttons use the saved mode before DOM ready and retain identity through hydration',()=>{
 for(const [saved,serverMode,purpose] of [['excl','incl','boligsalg'],['incl','excl','messe']]){
  const b=browser({local:{[priceDisplayKey]:saved},url:'https://konseptuell.no/utvalg.html?bruk='+purpose});b.run();
  const host=b.element('section',{id:'catalogUsage',class:'catalog-usage has-price-display'});
  const picker=b.element('div',{class:'price-display-picker',role:'group','aria-label':'Vis priser'});picker.innerHTML=pricePickerContent(serverMode);
  const incl=picker.querySelector('[data-price-mode="incl"]'),excl=picker.querySelector('[data-price-mode="excl"]');
  assert.equal(incl.getAttribute('aria-pressed'),String(serverMode==='incl'));assert.equal(excl.getAttribute('aria-pressed'),String(serverMode==='excl'));
  const price=b.element('span',{'data-price-gross':'3949'},formatPrice(3949));host.append(picker);b.body(host,price);
  const check=mode=>{
   assert.equal(host.querySelector('.price-display-picker'),picker);assert.equal(picker.querySelector('[data-price-mode="incl"]'),incl);assert.equal(picker.querySelector('[data-price-mode="excl"]'),excl);
   assert.equal(incl.getAttribute('aria-pressed'),String(mode==='incl'));assert.equal(excl.getAttribute('aria-pressed'),String(mode==='excl'));
   assert.equal(incl.textContent,'Inkl. mva.');assert.equal(excl.textContent,'Ekskl. mva.');assert.equal(b.document.querySelectorAll('.price-display-picker').length,1);
   assert.equal(price.textContent,formatPrice(mode==='incl'?3949:3159.2));assert.equal(price.dataset.priceGross,'3949');
  };
  check(saved);assert.equal(b.document.readyState,'loading');assert.equal(b.created,0,'existing controls must be updated without constructing replacements');
  b.ready();check(saved);assert.match(host.className,/(?:^|\s)has-price-display(?:\s|$)/);
  b.context({purpose});check(saved);
  for(const mode of ['incl','excl','incl']){b.click(mode,mode==='incl'?incl:excl);check(mode);b.flush();check(mode);}
  assert.equal(b.observers.length,1);assert.equal(b.listeners.get('click').length,1);
 }
});

test('parser continuation restores original text without retaining an early excl substitution',()=>{
 const b=browser({local:{[priceDisplayKey]:'excl'}});b.run();const caption=b.element('p',{class:'rate-caption'},'Leiepriser inkl. mva.');b.body(caption);const text=caption.childNodes[0];assert.equal(text.data,'Leiepriser ekskl. mva.');
 text.data+=' Levering inkluderer mva.';b.flush([{type:'characterData',target:text}]);assert.equal(text.data,'Leiepriser ekskl. mva. Levering er ekskl. mva.');
 b.ready();b.click('incl');assert.equal(text.data,'Leiepriser inkl. mva. Levering inkluderer mva.');b.click('excl');assert.equal(text.data,'Leiepriser ekskl. mva. Levering er ekskl. mva.');
});


test('initial mobile VAT link uses the saved opposite action before readiness and survives hydration and repeated clicks',()=>{
 for(const [saved,purpose] of [['excl','boligsalg'],['incl','messe']]){
  const b=browser({local:{[priceDisplayKey]:saved},url:'https://konseptuell.no/utvalg.html?bruk='+purpose});b.run();
  const host=b.element('section',{id:'catalogUsage',class:'catalog-usage has-price-display'});host.innerHTML=catalogUsageMarkup({purpose,confirmed:true});
  const help=host.querySelector('#catalogUsageHelp'),button=help.querySelector('.mobile-price-switch'),originalNode=button.childNodes[0];
  const price=b.element('span',{'data-price-gross':'400'},formatPrice(400));b.body(host,price);
  const check=mode=>{
   assert.equal(help.querySelector('.mobile-price-switch'),button);assert.equal(help.querySelectorAll('.mobile-price-switch').length,1);
   assert.equal(button.textContent,mode==='incl'?'Vis priser ekskl. mva.':'Vis priser inkl. mva.');
   assert.equal(help.childNodes[0].data,mode==='incl'?'Utvalg og leiepriser tilpasses bruksområdet. Alle priser inkluderer mva. ':'Utvalg og leiepriser tilpasses bruksområdet. Alle priser er ekskl. mva. ');
   assert.equal(price.textContent,formatPrice(mode==='incl'?400:320));assert.equal(price.dataset.priceGross,'400');
  };
  check(saved);assert.equal(button.childNodes[0],originalNode);assert.equal(b.created,0);
  b.flush();check(saved);assert.equal(button.childNodes[0],originalNode);
  b.ready();check(saved);assert.equal(button.childNodes[0],originalNode);
  b.context({purpose});check(saved);
  let mode=saved;for(let i=0;i<4;i++){b.click(null,button);mode=mode==='incl'?'excl':'incl';check(mode);b.flush();check(mode);}
 }
});

test('mobile VAT link waits for complete parser text without inserting or replacing parser nodes',()=>{
 const b=browser({local:{[priceDisplayKey]:'excl'}});b.run();
 const help=b.element('p',{id:'catalogUsageHelp'},'Alle priser inkluderer mva. '),button=b.element('button',{class:'mobile-price-switch',type:'button'});help.append(button);b.body(help);
 assert.equal(button.childNodes.length,0,'the parser must supply the button text');
 button.append('Vis priser eks');b.flush();const node=button.childNodes[0];assert.equal(node.data,'Vis priser eks');
 node.data+='kl. mva.';b.flush();assert.equal(button.childNodes[0],node);assert.equal(node.data,'Vis priser inkl. mva.');
 b.ready();assert.equal(button.childNodes[0],node);assert.equal(help.querySelectorAll('.mobile-price-switch').length,1);
 b.click(null,button);assert.equal(button.textContent,'Vis priser ekskl. mva.');assert.equal(help.childNodes[0].data,'Alle priser inkluderer mva. ');
});
