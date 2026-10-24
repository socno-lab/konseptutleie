import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCatalogPagination} from '../public/catalog-pagination.js';

// A small DOM adapter keeps these behavioural tests independent of browsers.
// Browser QA separately checks the real card markup and responsive layout.
class Element{
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.childNodes=[];this.attributes=new Map();this.listeners=new Map();this.hidden=false;this.id='';}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.childNodes.push(node);}}
 remove(){if(this.parentNode){const siblings=this.parentNode.childNodes;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;}}
 after(node){node.remove();const siblings=this.parentNode.childNodes;node.parentNode=this.parentNode;siblings.splice(siblings.indexOf(this)+1,0,node);}
 replaceChildren(...nodes){for(const child of [...this.childNodes])child.remove();this.append(...nodes);}
 setAttribute(name,value){this.attributes.set(name,String(value));}
 addEventListener(name,handler){this.listeners.set(name,handler);}
 removeEventListener(name,handler){if(this.listeners.get(name)===handler)this.listeners.delete(name);}
 click(){this.listeners.get('click')?.();}
 focus(options){this.ownerDocument.activeElement=this;this.ownerDocument.focusOptions=options;}
 insertAdjacentHTML(position,markup){assert.equal(position,'beforeend');for(const match of markup.matchAll(/<(article|aside)\b[^>]*>[\s\S]*?<\/\1>/g)){const node=new Element(this.ownerDocument,match[1]);node.markup=match[0];this.append(node);}}
}
function fixture(storage=null){const doc={createElement:tag=>new Element(doc,tag),defaultView:{sessionStorage:storage}},section=new Element(doc,'section'),grid=new Element(doc,'div');grid.id='products';section.append(grid);return {doc,section,grid,get controls(){return section.childNodes[1];}};}
function memoryStorage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
const products=Array.from({length:59},(_,index)=>({id:'product-'+index,name:'Produkt '+index}));
const renderItem=item=>'<article><a href="/leieprodukt.html?produkt='+item.id+'">'+item.name+'</a></article>';

test('only one batch is rendered initially, and further batches preserve cards, links and final teaser',()=>{
 const view=fixture(),rendered=[];
 const controller=mountCatalogPagination(view.grid,{items:products,key:'alle',renderItem:item=>{rendered.push(item.id);return renderItem(item);},tailHtml:'<aside>Finner du ikke det du leter etter?</aside>'});
 const [status,button]=view.controls.childNodes,first=view.grid.childNodes[0],tail=view.grid.childNodes.at(-1);
 assert.equal(rendered.length,24);assert.equal(controller.visibleCount,24);assert.equal(controller.total,59);
 assert.equal(view.grid.childNodes.length,25);assert.equal(status.textContent,'Viser 24 av 59 produkter');assert.equal(button.textContent,'Vis 24 flere');
 assert.equal(button.type,'button');assert.equal(button.attributes.get('aria-controls'),'products');
 assert.equal(status.className,'hint catalog-pagination-status');assert.equal(button.className,'button dark catalog-pagination-button');
 assert.match(first.markup,/href="\/leieprodukt\.html\?produkt=product-0"/);
 button.click();
 assert.equal(rendered.length,48);assert.equal(controller.visibleCount,48);assert.equal(view.grid.childNodes[0],first);assert.equal(view.grid.childNodes.at(-1),tail);
 assert.equal(button.textContent,'Vis 11 flere');assert.match(view.grid.childNodes[47].markup,/product-47/);
 button.click();
 assert.equal(rendered.length,59);assert.equal(controller.visibleCount,59);assert.equal(view.grid.childNodes.at(-1),tail);assert.equal(button.hidden,true);
 assert.equal(status.textContent,'Viser 59 av 59 produkter');assert.equal(view.doc.activeElement,status);assert.deepEqual(view.doc.focusOptions,{preventScroll:true});
 controller.showMore();assert.equal(rendered.length,59);
});

test('basket or price refresh keeps the visible range; changing filters starts with 24',()=>{
 const view=fixture(),storage=memoryStorage();
 const controller=mountCatalogPagination(view.grid,{items:products,key:'alle',renderItem,storage});controller.showMore();
 const refreshed=products.map(item=>({...item,name:item.name+' oppdatert'}));let calls=0;
 assert.equal(mountCatalogPagination(view.grid,{items:refreshed,key:'alle',renderItem:item=>{calls++;return renderItem(item);}}),controller);
 assert.equal(calls,48);assert.equal(controller.visibleCount,48);assert.match(view.grid.childNodes[0].markup,/oppdatert/);assert.equal(view.section.childNodes.length,2);
 mountCatalogPagination(view.grid,{items:products,key:'stoler',renderItem});assert.equal(controller.visibleCount,24);
 mountCatalogPagination(view.grid,{items:products,key:'alle',renderItem});assert.equal(controller.visibleCount,24);
});

test('a fresh catalog page restores its loaded range for returning from a product',()=>{
 const storage=memoryStorage(),first=fixture(storage);
 const controller=mountCatalogPagination(first.grid,{items:products,key:'/utvalg.html?kategori=Stoler',renderItem});controller.showMore();
 const returned=fixture(storage);let rendered=0;
 const restored=mountCatalogPagination(returned.grid,{items:products,key:'/utvalg.html?kategori=Stoler',renderItem:item=>{rendered++;return renderItem(item);}});
 assert.equal(restored.visibleCount,48);assert.equal(rendered,48);
 const reduced=fixture(storage);assert.equal(mountCatalogPagination(reduced.grid,{items:products.slice(0,29),key:'/utvalg.html?kategori=Stoler',renderItem}).visibleCount,29);
});

test('small or empty lists need no button, and blocked storage does not prevent browsing',()=>{
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},view=fixture(broken);
 const controller=mountCatalogPagination(view.grid,{items:[],key:'empty',renderItem});
 assert.equal(controller.visibleCount,0);assert.equal(view.controls.hidden,true);assert.equal(view.grid.childNodes.length,0);
 mountCatalogPagination(view.grid,{items:products,key:'all',renderItem});controller.showMore();assert.equal(controller.visibleCount,48);
 mountCatalogPagination(view.grid,{items:products.slice(0,7),key:'filtered',renderItem});assert.equal(controller.visibleCount,7);assert.equal(view.controls.hidden,true);
 controller.destroy();assert.equal(view.section.childNodes.length,1);controller.showMore();assert.equal(controller.visibleCount,7);
 assert.throws(()=>mountCatalogPagination(view.grid,{items:products}),/items og renderItem/);assert.equal(view.section.childNodes.length,1);
});

test('23 rental products and a final request teaser fill the grid, followed by batches of 24',()=>{
 const items=Array.from({length:83},(_,index)=>({id:'rental-'+index,name:'Produkt '+index})),view=fixture(),rendered=[];
 const options={items,key:'rent',initialPageSize:23,renderItem:item=>{rendered.push(item.id);return renderItem(item);},tailHtml:'<aside>Tilpasset forespørsel</aside>'};
 const controller=mountCatalogPagination(view.grid,options),[status,button]=view.controls.childNodes,first=view.grid.childNodes[0],tail=view.grid.childNodes.at(-1);
 assert.equal(controller.visibleCount,23);assert.equal(controller.total,83);assert.equal(rendered.length,23);assert.equal(view.grid.childNodes.length,24);
 assert.equal(status.textContent,'Viser 23 av 83 produkter');assert.equal(button.textContent,'Vis 24 flere');
 button.click();
 assert.equal(controller.visibleCount,47);assert.equal(rendered.length,47);assert.equal(view.grid.childNodes.length,48);assert.equal(view.grid.childNodes[0],first);assert.equal(view.grid.childNodes.at(-1),tail);
 button.click();
 assert.equal(controller.visibleCount,71);assert.equal(rendered.length,71);assert.equal(view.grid.childNodes.length,72);assert.equal(button.textContent,'Vis 12 flere');assert.equal(view.grid.childNodes.at(-1),tail);
 button.click();
 assert.equal(controller.visibleCount,83);assert.equal(rendered.length,83);assert.equal(view.grid.childNodes.at(-1),tail);assert.equal(button.hidden,true);assert.equal(status.textContent,'Viser 83 av 83 produkter');assert.equal(view.doc.activeElement,status);
 controller.showMore();assert.equal(rendered.length,83);
});

test('the initial rental batch and loaded range survive refresh, filter reset and returning from a product',()=>{
 const storage=memoryStorage(),view=fixture(storage),options={items:products,key:'rent-all',initialPageSize:23,renderItem,tailHtml:'<aside>Tilpasset forespørsel</aside>'};
 const controller=mountCatalogPagination(view.grid,options);controller.showMore();assert.equal(controller.visibleCount,47);
 mountCatalogPagination(view.grid,options);assert.equal(controller.visibleCount,47);
 const returned=fixture(storage);assert.equal(mountCatalogPagination(returned.grid,options).visibleCount,47);assert.equal(returned.grid.childNodes.length,48);
 mountCatalogPagination(view.grid,{...options,key:'rent-search'});assert.equal(controller.visibleCount,23);
 mountCatalogPagination(view.grid,options);assert.equal(controller.visibleCount,23);
});

test('legacy batches align to desktop rows without losing seen products or loading a whole extra batch',()=>{
 const items=Array.from({length:100},(_,index)=>({id:'product-'+index,name:'Produkt '+index}));
 for(const [legacyCount,expected] of [[24,27],[48,51]]){
  const storage=memoryStorage(),old=fixture(storage),options={items,key:'legacy',renderItem};
  const oldController=mountCatalogPagination(old.grid,options);if(legacyCount===48)oldController.showMore();
  const returned=fixture(storage),controller=mountCatalogPagination(returned.grid,{...options,initialPageSize:23,countAlignment:4,tailHtml:'<aside>Tilpasset forespørsel</aside>'});
  assert.equal(controller.visibleCount,expected);assert.equal(returned.grid.childNodes.length,expected+1);
  mountCatalogPagination(old.grid,{...options,initialPageSize:23,countAlignment:4});assert.equal(oldController.visibleCount,expected);
 }
});

test('24 rental matches still offer the final product after an initial batch of 23',()=>{
 const view=fixture(),controller=mountCatalogPagination(view.grid,{items:products.slice(0,24),key:'rent',initialPageSize:23,renderItem,tailHtml:'<aside>Tilpasset forespørsel</aside>'});
 const [status,button]=view.controls.childNodes;
 assert.equal(controller.visibleCount,23);assert.equal(view.controls.hidden,false);assert.equal(button.textContent,'Vis 1 flere');
 button.click();assert.equal(controller.visibleCount,24);assert.equal(button.hidden,true);assert.equal(status.textContent,'Viser 24 av 24 produkter');assert.equal(view.grid.childNodes.length,25);
});

test('mobile package batches reserve two grid slots for their full-width request teaser',()=>{
 const items=Array.from({length:80},(_,index)=>({id:'mobile-'+index,name:'Produkt '+index})),view=fixture(),options={items,key:'mobile-packages',initialPageSize:22,countAlignment:2,renderItem,tailHtml:'<aside>Tilpasset pakkeforespørsel</aside>'};
 const controller=mountCatalogPagination(view.grid,options),[status,button]=view.controls.childNodes,first=view.grid.childNodes[0],tail=view.grid.childNodes.at(-1);
 assert.equal(controller.visibleCount,22);assert.equal(controller.total,80);assert.equal(view.grid.childNodes.length,23);assert.equal(status.textContent,'Viser 22 av 80 produkter');assert.equal(button.textContent,'Vis 24 flere');
 button.click();
 assert.equal(controller.visibleCount,46);assert.equal(view.grid.childNodes.length,47);assert.equal(status.textContent,'Viser 46 av 80 produkter');assert.equal(view.grid.childNodes[0],first);assert.equal(view.grid.childNodes.at(-1),tail);
 mountCatalogPagination(view.grid,options);assert.equal(controller.visibleCount,46);assert.equal(view.grid.childNodes.at(-1).markup,tail.markup);
});

test('responsive package row changes retain seen products and reveal at most three extra products',()=>{
 const items=Array.from({length:100},(_,index)=>({id:'resize-'+index,name:'Produkt '+index})),view=fixture(),options={items,key:'same-filter',storage:memoryStorage(),renderItem,tailHtml:'<aside>Tilpasset forespørsel</aside>'};
 const controller=mountCatalogPagination(view.grid,{...options,initialPageSize:23,countAlignment:4});assert.equal(controller.visibleCount,23);
 for(const [initialPageSize,countAlignment,expected] of [[22,2,24],[23,4,27],[22,2,28],[23,3,29],[23,4,31]]){
  const previous=controller.visibleCount;
  mountCatalogPagination(view.grid,{...options,initialPageSize,countAlignment});
  assert.equal(controller.visibleCount,expected);assert(controller.visibleCount>=previous);assert(controller.visibleCount-previous<=3);
  assert.equal((controller.visibleCount+(countAlignment===2?2:1))%countAlignment,0);
  assert.match(view.grid.childNodes[previous-1].markup,new RegExp('resize-'+(previous-1)));
 }
 assert.equal(view.grid.childNodes.at(-1).markup,'<aside>Tilpasset forespørsel</aside>');assert.equal(view.controls.childNodes[0].textContent,'Viser 31 av 100 produkter');
 controller.showMore();assert.equal(controller.visibleCount,55);
 mountCatalogPagination(view.grid,{...options,initialPageSize:23,countAlignment:4});assert.equal(controller.visibleCount,55);
 const returned=fixture();
 assert.equal(mountCatalogPagination(returned.grid,{...options,initialPageSize:22,countAlignment:2}).visibleCount,56);
});

test('the compact mobile generic teaser occupies one card slot after 23 products, just as on desktop',()=>{
 const storage=memoryStorage(),view=fixture(storage),options={items:products,key:'generic-catalog',initialPageSize:23,countAlignment:2,renderItem,tailHtml:'<article><h3>Savner du noe?</h3><p>Vi har mye mer enn det som vises her. Fortell oss hva du trenger.</p><button>Fortell oss ↗</button></article>'};
 const controller=mountCatalogPagination(view.grid,options),first=view.grid.childNodes[0],tail=view.grid.childNodes.at(-1);
 assert.equal(controller.visibleCount,23);assert.equal(controller.total,59);assert.equal(view.grid.childNodes.length,24);assert.equal(view.controls.childNodes[0].textContent,'Viser 23 av 59 produkter');
 controller.showMore();assert.equal(controller.visibleCount,47);assert.equal(view.grid.childNodes.length,48);assert.equal(view.grid.childNodes[0],first);assert.equal(view.grid.childNodes.at(-1),tail);
 for(const countAlignment of [3,4,2]){
  mountCatalogPagination(view.grid,{...options,countAlignment});
  assert.equal(controller.visibleCount,47);assert.equal((controller.visibleCount+1)%countAlignment,0);assert.equal(view.grid.childNodes.at(-1).markup,tail.markup);
 }
 const returned=fixture(storage);assert.equal(mountCatalogPagination(returned.grid,options).visibleCount,47);
 controller.showMore();assert.equal(controller.visibleCount,59);assert.equal(view.controls.childNodes[1].hidden,true);
});
